import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  const info=await stat(file);if(!info.isFile())throw new Error('Not found');
  const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('未找到文件。请确认 dist/ 构建目录存在。');}
});
let port=Number(process.env.PORT||5173),attempts=0;
server.on('error',error=>{if(error.code==='EADDRINUSE'&&attempts++<20){port++;server.listen(port,'127.0.0.1');}else{console.error(error.message);process.exitCode=1;}});
server.on('listening',()=>{const url=`http://127.0.0.1:${port}`;console.log(`\n赛车车库已启动：${url}\n按 Ctrl+C 关闭服务器。\n`);if(process.argv.includes('--open')){if(process.platform==='darwin')spawn('open',[url],{stdio:'ignore'});else if(process.platform==='win32')spawn('cmd',['/c','start','',url],{stdio:'ignore'});else spawn('xdg-open',[url],{stdio:'ignore'});}});
server.listen(port,'127.0.0.1');
