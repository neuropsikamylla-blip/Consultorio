// Rodar: node docs/provas/prova-auth-passo1.mjs
// Verificar o JS extraído: node docs/provas/prova-auth-passo1.mjs --extract | node --check

import fs from 'node:fs';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const scriptMatch=html.match(/<script>\s*(const SUPA_URL=[\s\S]*?)<\/script>/);
if(!scriptMatch)throw new Error('Bloco <script> principal não encontrado.');

const start='// ── AUTH-CORE-INICIO ──';
const end='// ── AUTH-CORE-FIM ──';
const startAt=scriptMatch[1].indexOf(start);
const endAt=scriptMatch[1].indexOf(end);
if(startAt<0||endAt<0||endAt<=startAt)throw new Error('Marcadores do auth core não encontrados.');
const authCore=scriptMatch[1].slice(startAt+start.length,endAt);

if(process.argv.includes('--extract')){
  process.stdout.write(authCore);
}else{
  const AUTH_KEY='test_auth';
  const SUPA_URL='https://supabase.test';
  const SUPA_KEY='anon-test';
  const silentConsole={error:function(){}};
  const decodeBase64=function(value){return Buffer.from(value,'base64').toString('binary');};

  function jwt(exp){
    return 'header.'+Buffer.from(JSON.stringify({exp:exp})).toString('base64url')+'.signature';
  }

  function response(status,data){
    return{
      ok:status>=200&&status<300,
      status:status,
      json:async function(){return data;},
      text:async function(){return data==null?'':JSON.stringify(data);}
    };
  }

  function makeEnv(initialAuth,fetchStub){
    const values=new Map();
    if(initialAuth!==undefined)values.set(AUTH_KEY,JSON.stringify(initialAuth));
    const localStorage={
      getItem:function(key){return values.has(key)?values.get(key):null;},
      setItem:function(key,value){values.set(key,String(value));},
      removeItem:function(key){values.delete(key);}
    };
    const factory=new Function('localStorage','fetch','console','SUPA_URL','SUPA_KEY','AUTH_KEY','atob',authCore+'\nreturn {getAuthToken:getAuthToken,refreshAuthToken:refreshAuthToken,ensureFreshToken:ensureFreshToken,supaFetch:supaFetch};');
    return{api:factory(localStorage,fetchStub,silentConsole,SUPA_URL,SUPA_KEY,AUTH_KEY,decodeBase64),localStorage:localStorage};
  }

  let passed=0;
  const total=6;
  async function test(number,description,run){
    try{
      if(!await run())throw new Error('resultado inesperado');
      passed++;
      console.log('PASS '+number+' — '+description);
    }catch(error){
      console.log('FAIL '+number+' — '+description+' ('+error.message+')');
    }
  }

  await test(1,'token válido não chama a rede',async function(){
    let calls=0;
    const env=makeEnv({access_token:jwt(Math.floor(Date.now()/1000)+3600),refresh_token:'refresh-1'},async function(){calls++;throw new Error('rede não esperada');});
    return await env.api.ensureFreshToken()===true&&calls===0;
  });

  await test(2,'token expirando é renovado e salvo',async function(){
    let calls=0;
    const newToken=jwt(Math.floor(Date.now()/1000)+3600);
    const env=makeEnv({access_token:jwt(Math.floor(Date.now()/1000)+30),refresh_token:'refresh-2',email:'user@test'},async function(url){
      calls++;
      if(!url.includes('/auth/v1/token'))throw new Error('endpoint inesperado');
      return response(200,{access_token:newToken,refresh_token:'refresh-new'});
    });
    const result=await env.api.ensureFreshToken();
    const saved=JSON.parse(env.localStorage.getItem(AUTH_KEY));
    return result===true&&calls===1&&saved.access_token===newToken;
  });

  await test(3,'sem token salvo retorna false sem quebrar',async function(){
    let calls=0;
    const env=makeEnv(undefined,async function(){calls++;return response(500,null);});
    return await env.api.ensureFreshToken()===false&&calls===0;
  });

  await test(4,'payload corrompido tenta renovar sem lançar',async function(){
    let calls=0;
    const env=makeEnv({access_token:'header.%%%corrompido%%%.signature',refresh_token:'refresh-4'},async function(){
      calls++;
      return response(200,{access_token:jwt(Math.floor(Date.now()/1000)+3600)});
    });
    return await env.api.ensureFreshToken()===true&&calls===1;
  });

  await test(5,'supaFetch repete POST após 401 e refresh',async function(){
    let restCalls=0;
    let refreshCalls=0;
    const env=makeEnv({access_token:jwt(Math.floor(Date.now()/1000)+3600),refresh_token:'refresh-5'},async function(url){
      if(url.includes('/auth/v1/token')){
        refreshCalls++;
        return response(200,{access_token:jwt(Math.floor(Date.now()/1000)+7200)});
      }
      restCalls++;
      if(restCalls===1)return response(401,{message:'expired'});
      return response(200,{saved:true});
    });
    const result=await env.api.supaFetch('POST','packages',{id:'pkg-1'});
    return restCalls===2&&refreshCalls===1&&result&&result.saved===true;
  });

  await test(6,'refresh concorrente compartilha uma única requisição',async function(){
    let refreshCalls=0;
    const env=makeEnv({access_token:'old-token',refresh_token:'refresh-6'},async function(){
      refreshCalls++;
      await new Promise(function(resolve){setTimeout(resolve,20);});
      return response(200,{access_token:'new-token'});
    });
    const results=await Promise.all([env.api.refreshAuthToken(),env.api.refreshAuthToken()]);
    return refreshCalls===1&&results[0]===true&&results[1]===true;
  });

  console.log('RESULTADO: '+passed+'/'+total+' PASS');
  if(passed!==total)process.exit(1);
}
