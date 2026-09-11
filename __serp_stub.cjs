const http = require('http');
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const q = url.searchParams.get('q') || '';
  if (q.includes('denied')) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { code: 403, message: 'Custom Search API has not been used in project 123 before or it is disabled.' } }));
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ items: [
    { title: 'Competitor One', link: 'https://rival-one.co.zw/', displayLink: 'rival-one.co.zw' },
    { title: 'Manica SkyView', link: 'https://manicaskyview.co.zw/', displayLink: 'manicaskyview.co.zw' },
  ] }));
}).listen(8098, () => console.log('stub CSE on 8098'));
