import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ code: -1, message: '缺少 url 参数' }, { status: 400 });
  }

  // 提取 BV 号和 p 参数
  const bvidMatch = url.match(/BV[a-zA-Z0-9]{10}/);
  if (!bvidMatch) {
    return NextResponse.json({ code: -1, message: '无法从链接中提取 BV 号' }, { status: 400 });
  }

  const bvid = bvidMatch[0];
  const pMatch = url.match(/[?&]p=(\d+)/);
  const pageNum = pMatch ? parseInt(pMatch[1], 10) : 1;

  try {
    // 1. 获取视频基本信息（含所有分P）
    const viewRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
      },
    });
    const viewData = await viewRes.json();

    if (viewData.code !== 0) {
      return NextResponse.json(
        { code: -1, message: viewData.message || 'B站 API 返回错误' },
        { status: 500 }
      );
    }

    const { data } = viewData;

    // 选集处理：根据 p 参数找对应分P
    const pages = data.pages || [];
    let targetPage = null;
    for (const p of pages) {
      if (p.page === pageNum) {
        targetPage = p;
        break;
      }
    }

    let cid = data.cid;
    let title = data.title;
    let duration = data.duration;

    if (targetPage) {
      cid = targetPage.cid;
      duration = targetPage.duration;
      if (targetPage.part) {
        title = `${data.title} - ${targetPage.part}`;
      }
    }

    // 2. 获取字幕信息
    let hasSubtitle = false;
    try {
      const playerRes = await fetch(
        `https://api.bilibili.com/x/player/v2?cid=${cid}&bvid=${bvid}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.bilibili.com',
          },
        }
      );
      const playerData = await playerRes.json();
      if (playerData.code === 0) {
        const subtitles = playerData.data?.subtitle?.subtitles || [];
        const aiSubtitles = playerData.data?.subtitle?.ai_subtitles || [];
        if (subtitles.length > 0 || aiSubtitles.length > 0) {
          hasSubtitle = true;
        }
      }
    } catch {
      // 字幕检测失败不影响主流程
    }

    return NextResponse.json({
      code: 0,
      data: {
        bvid,
        title,
        duration,
        cover: data.pic,
        uploader: data.owner?.name || '',
        hasSubtitle,
        desc: data.desc,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: -1, message: '请求失败: ' + err.message },
      { status: 500 }
    );
  }
}
