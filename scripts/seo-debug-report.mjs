import photoHandler from '../api/og-photo.js';
import storyHandler from '../api/og-story.js';

function makeRes() {
  return {
    headers: {},
    statusCode: 200,
    body: '',
    setHeader(k,v){this.headers[k]=v;},
    status(c){this.statusCode=c; return this;},
    send(b){this.body=b; return this;},
    redirect(c,url){this.statusCode=c; this.body=`REDIRECT:${url}`; return this;}
  };
}

function extract(html){
  const m=(re)=> (html.match(re)||[]).slice(0,5);
  return {
    title: m(/<title>[^<]*<\/title>/gi)[0]||'',
    canonical: m(/<link rel="canonical"[^>]*>/gi)[0]||'',
    description: m(/<meta name="description"[^>]*>/gi)[0]||'',
    og: m(/<meta property="og:[^"]+"[^>]*>/gi),
    twitter: m(/<meta name="twitter:[^"]+"[^>]*>/gi),
    jsonLdCount: (html.match(/application\/ld\+json/gi)||[]).length,
    visibleHeading: m(/<h1>[^<]+<\/h1>/gi)[0]||''
  }
}

const photoReq = { query: { id: 'yellow-magnolia-bloom' } };
const storyReq = { query: { slug: 'three-days-snow-monkeys-nagano' } };

const photoRes = makeRes();
const storyRes = makeRes();
await photoHandler(photoReq, photoRes);
await storyHandler(storyReq, storyRes);

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  photoRoute: { status: photoRes.statusCode, meta: extract(photoRes.body) },
  storyRoute: { status: storyRes.statusCode, meta: extract(storyRes.body) }
}, null, 2));
