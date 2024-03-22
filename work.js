const MY_DOMAIN = 'Replace by your custom domain name'; // Your custom domain name
const CANVA_DOMAIN = 'Replace by Domain name of the Canva website'; //The domain name of the Canva website, make sure there are no trailing slashes
const GOOGLE_FONT = 'Ubuntu'; Choose a Google font

// Map the request path to the URL of the Canva page
const SLUG_TO_PAGE = {
  '': `https://${CANVA_DOMAIN}/`, // Default mapping
  // More path-to-URL mappings can be added
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Special processing (e.g. fonts, CSS files)
  if (url.pathname.endsWith('.woff2') || url.pathname.endsWith('.css')) {
    return handleResourceRequest(url);
  }

  // Special treatment of /robots.txt
  if (url.pathname === '/robots.txt') {
    return new Response('User-agent: *\nAllow: /');
  }

  // Handle HTML page requests
  return fetchAndModifyHTML(request, url);
}

async function handleResourceRequest(url) {
  const targetUrl = `https://${CANVA_DOMAIN}${url.pathname}`;
  
  // Direct proxy requests to the target resource
  const response = await fetch(targetUrl);
  // Add CORS headers to solve cross-domain problems
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
    return new Response('Request blocked, please contact website owner', { status: response.status });
  }

  const text = await response.text();

  // Introduce and use Google fonts in HTML content
  const modifiedText = text
    .replace(/<head>/, `<head><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">`)
    .replace(/src="\//g, `src="https://${CANVA_DOMAIN}/`)
    .replace(/href="\//g, `href="https://${CANVA_DOMAIN}/`)
    .replace(/<div class="footer-container">[\s\S]*?<\/div>/g, '') // Remove the footer-container element
    .replace(/font-family:.*?;/g, 'font-family: \'${GOOGLE_FONT}\', sans-serif;'); // Replace all fonts with 'GOOGLE_FONT'

  return new Response(modifiedText, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'public, max-age=0',
      'Access-Control-Allow-Origin': `https://${MY_DOMAIN}`, // Add the CORS header
    }
  });
}
