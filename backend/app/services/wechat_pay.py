import time
import json
import base64
import random
import os
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import httpx
from app.config import settings


class WeChatPayV3:
    BASE_URL = "https://api.mch.weixin.qq.com"

    def __init__(self):
        self.mchid = settings.WECHAT_PAY_MCHID
        self.apiv3_key = settings.WECHAT_PAY_APIV3_KEY
        self.notify_url = settings.WECHAT_PAY_NOTIFY_URL
        self.cert_serial = settings.WECHAT_PAY_CERT_SERIAL
        self.private_key_path = settings.WECHAT_PAY_PRIVATE_KEY_PATH

        if not all([self.mchid, self.apiv3_key, self.cert_serial]):
            raise ValueError("微信支付配置不完整，请检查 WECHAT_PAY_MCHID / APIV3_KEY / CERT_SERIAL")

        # 加载商户私钥
        if not os.path.exists(self.private_key_path):
            raise FileNotFoundError(f"商户私钥文件不存在: {self.private_key_path}")
        with open(self.private_key_path, "r") as f:
            self.private_key = serialization.load_pem_private_key(f.read().encode(), password=None)

        # 平台证书缓存 {serial: public_key}
        self.platform_certificates = {}
        self._load_platform_certs()

    def _sign(self, method: str, url_path: str, timestamp: str, nonce_str: str, body: str = "") -> str:
        message = f"{method}\n{url_path}\n{timestamp}\n{nonce_str}\n{body}\n"
        signature = self.private_key.sign(message.encode(), padding.PKCS1v15(), hashes.SHA256())
        return base64.b64encode(signature).decode()

    def _authorization(self, method: str, url_path: str, body: str = "") -> str:
        timestamp = str(int(time.time()))
        nonce_str = "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=32))
        signature = self._sign(method, url_path, timestamp, nonce_str, body)
        auth = (
            f'mchid="{self.mchid}",'
            f'nonce_str="{nonce_str}",'
            f'signature="{signature}",'
            f'timestamp="{timestamp}",'
            f'serial_no="{self.cert_serial}"'
        )
        return f"WECHATPAY2-SHA256-RSA2048 {auth}"

    def _request(self, method: str, url_path: str, body: dict = None):
        body_str = json.dumps(body, ensure_ascii=False) if body else ""
        headers = {
            "Authorization": self._authorization(method, url_path, body_str),
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        url = f"{self.BASE_URL}{url_path}"
        with httpx.Client() as client:
            resp = client.request(
                method, url, headers=headers,
                content=body_str.encode() if body_str else None,
                timeout=30,
            )
            print(f"[WeChatPay] {method} {url_path} -> {resp.status_code}")
            if resp.status_code >= 400:
                print(f"[WeChatPay] Error body: {resp.text}")
            resp.raise_for_status()
            return resp.json() if resp.text else {}

    def _load_platform_certs(self):
        """下载并解密微信支付平台证书（用于回调验签）"""
        try:
            certs_data = self._request("GET", "/v3/certificates")
            for cert in certs_data.get("data", []):
                serial = cert["serial_no"]
                enc = cert["encrypt_certificate"]
                if enc.get("algorithm") != "AEAD_AES_256_GCM":
                    continue
                nonce = enc["nonce"].encode()
                aad = enc["associated_data"].encode()
                ciphertext = base64.b64decode(enc["ciphertext"])
                aesgcm = AESGCM(self.apiv3_key.encode())
                plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
                # 微信支付平台证书是 X.509 格式，不是直接的公钥
                from cryptography import x509
                cert = x509.load_pem_x509_certificate(plaintext)
                public_key = cert.public_key()
                self.platform_certificates[serial] = public_key
                print(f"[WeChatPay] Loaded platform cert: {serial}")
        except Exception as e:
            print(f"[WeChatPay] Failed to load platform certs: {e}")

    # ==================== 对外接口 ====================

    def create_native_order(self, out_trade_no: str, description: str, amount_cent: int) -> dict:
        """Native 支付：统一下单，返回 code_url"""
        body = {
            "mchid": self.mchid,
            "appid": settings.WECHAT_PAY_APPID,
            "out_trade_no": out_trade_no,
            "description": description,
            "notify_url": self.notify_url,
            "amount": {
                "total": amount_cent,
                "currency": "CNY",
            },
        }
        return self._request("POST", "/v3/pay/transactions/native", body)

    def verify_notify(self, headers: dict, body_str: str) -> bool:
        """验签微信回调请求"""
        serial = headers.get("Wechatpay-Serial")
        nonce = headers.get("Wechatpay-Nonce")
        timestamp = headers.get("Wechatpay-Timestamp")
        signature = headers.get("Wechatpay-Signature")

        if not all([serial, nonce, timestamp, signature]):
            print("[WeChatPay] Missing notify headers")
            return False

        public_key = self.platform_certificates.get(serial)
        if not public_key:
            self._load_platform_certs()
            public_key = self.platform_certificates.get(serial)
            if not public_key:
                print(f"[WeChatPay] Platform cert not found: {serial}")
                return False

        message = f"{timestamp}\n{nonce}\n{body_str}\n"
        try:
            sig_bytes = base64.b64decode(signature)
            public_key.verify(sig_bytes, message.encode(), padding.PKCS1v15(), hashes.SHA256())
            return True
        except Exception as e:
            print(f"[WeChatPay] Verify failed: {e}")
            return False

    def decrypt_notify(self, body_json: dict) -> dict:
        """解密微信回调中的敏感数据"""
        resource = body_json.get("resource", {})
        if resource.get("algorithm") != "AEAD_AES_256_GCM":
            print("[WeChatPay] Unknown algorithm")
            return None

        nonce = resource["nonce"].encode()
        aad = resource["associated_data"].encode()
        ciphertext = base64.b64decode(resource["ciphertext"])

        aesgcm = AESGCM(self.apiv3_key.encode())
        try:
            plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
            return json.loads(plaintext.decode())
        except Exception as e:
            print(f"[WeChatPay] Decrypt failed: {e}")
            return None


# 单例
_wechat_pay_instance = None

def get_wechat_pay() -> WeChatPayV3:
    global _wechat_pay_instance
    if _wechat_pay_instance is None:
        _wechat_pay_instance = WeChatPayV3()
    return _wechat_pay_instance
