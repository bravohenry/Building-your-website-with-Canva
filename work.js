const MY_DOMAIN = 'cn.goodman.today'; // 你的自定义域名
const CANVA_DOMAIN = 'coins404.my.canva.site'; // Canva 网站的域名，确保没有尾随斜杠
const CANVA_DOMAIN_EXTRA = 'chinese'// Canva 网站的域名后面的内容，确保没有尾随斜杠
const GOOGLE_FONT = 'Ubuntu';


// 将请求路径映射到 Canva 页面的 URL
const SLUG_TO_PAGE = {
  '': `https://${CANVA_DOMAIN}/${CANVA_DOMAIN_EXTRA}`, // 默认映射
  // 可以添加更多特定路径到URL的映射
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // 特殊处理（例如字体、CSS文件）
  if (url.pathname.endsWith('.woff2') || url.pathname.endsWith('.css')) {
    return handleResourceRequest(url);
  }

  // 对 /robots.txt 的特殊处理
  if (url.pathname === '/robots.txt') {
    return new Response('User-agent: *\nAllow: /');
  }

  // 处理 HTML 页面请求
  return fetchAndModifyHTML(request, url);
}

async function handleResourceRequest(url) {
  const targetUrl = `https://${CANVA_DOMAIN}${url.pathname}`;
  
  // 直接代理请求到目标资源
  const response = await fetch(targetUrl);
  // 添加 CORS 头部以解决跨域问题
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', `https://${MY_DOMAIN}`);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

async function fetchAndModifyHTML(request, url) {
  const path = url.pathname.substring(1);
  const canvaUrl = SLUG_TO_PAGE[path] || SLUG_TO_PAGE[''];
  
  const response = await fetch(canvaUrl, {
    headers: {
      'User-Agent': request.headers.get('User-Agent'),
      'Referer': canvaUrl,
      'Accept-Language': request.headers.get('Accept-Language'),
    }
  });

  if (!response.ok) {
    return new Response('请求被阻止，请联系网站所有者', { status: response.status });
  }

  const text = await response.text();

  // 在 HTML 内容中引入谷歌字体并使用
  const modifiedText = text
    .replace(/<head>/, `<head><link href="https://fonts.googleapis.com/css?family=${GOOGLE_FONT.replace(' ', '+')}:Regular,Bold,Italic&display=swap" rel="stylesheet">`)
    .replace(/src="\//g, `src="https://${CANVA_DOMAIN}/`)
    .replace(/href="\//g, `href="https://${CANVA_DOMAIN}/`)
    .replace(/<div class="footer-container">[\s\S]*?<\/div>/g, '') // 移除 footer-container 元素
    .replace(/font-family:.*?;/g, `font-family: '${GOOGLE_FONT}', sans-serif;`); // 将所有字体更换为 'GOOGLE_FONT'

  return new Response(modifiedText, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'public, max-age=0',
      'Access-Control-Allow-Origin': `https://${MY_DOMAIN}`, // 添加 CORS 头部
    }
  });
}
