from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./videonotes.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    HAI_WHISPER_URL: str = "http://119.45.200.37:8000"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_API_URL: str = "https://api.deepseek.com/v1/chat/completions"
    BAIDU_PAN_APP_KEY: str = ""
    BAIDU_PAN_SECRET_KEY: str = ""
    BAIDU_PAN_APP_ID: str = ""
    BAIDU_PAN_REDIRECT_URI: str = ""

    # 微信支付配置
    WECHAT_PAY_MCHID: str = ""
    WECHAT_PAY_APIV3_KEY: str = ""
    WECHAT_PAY_NOTIFY_URL: str = "https://flownote.cn/api/pay/notify"
    WECHAT_PAY_CERT_SERIAL: str = ""
    WECHAT_PAY_PRIVATE_KEY_PATH: str = "./certs/apiclient_key.pem"
    WECHAT_PAY_APPID: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
