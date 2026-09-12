const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {grade}=require('../server/providers'),{floors}=require('../public/js/floors');
const reply={grade:'F',flag:false,provenance:'uncertain',observedObject:'a blue ribbon',visualDetails:'a narrow blue strip',headline:'ANOTHER LITTLE THING PLEASE',response:'A blue ribbon has wandered into my workshop! It looks lovely, but this little hole needs something that can patch it. Perhaps bring some tape another time.\nA ribbon dances in the light,\nA patch would set this hole just right.'};
const image='data:image/png;base64,'+fs.readFileSync('public/assets/rooms/cavity-filling-caramels-arrival.png').toString('base64');

test('every character gets the short spoken verdict direction for photos and typed answers',()=>{
 const {gradingPrompt}=require('../server/providers');
 for(const floor of Object.values(floors))for(const kind of ['photo','text']){
  const prompt=gradingPrompt(floor,kind);
  assert.match(prompt,/25-40 words total/);
  assert.match(prompt,/one short sentence/);
  assert.ok(!prompt.includes('no word-count limit'));
 }
});
test('long replies and short headlines pass once, without word caps or truncation',async()=>{
 const long={...reply,headline:'THANKS',response:Array(70).fill('This ribbon is an interesting offering for this room.').join(' ')+'\nA ribbon dances in the light,\nA patch would set this hole just right.'};
 let calls=0;const client={messages:{create:async()=>{calls++;return {content:[{text:JSON.stringify(long)}]};}}};
 const result=await grade(image,floors['cavity-filling-caramels'],false,undefined,{client});
 assert.equal(calls,1);assert.equal(result.response,long.response);assert.equal(result.headline,'THANKS');
 assert.ok(result.response.length>1600);assert.ok(result.ttsResponse.includes(long.response.split('\n')[0]));
});
test('a malformed image verdict is repaired using its actual text, preserving the assessment',async()=>{
 const calls=[],bad={...reply,response:reply.response.replace(/\n/g,' ')};
 const client={messages:{create:async args=>{calls.push(args);return {content:[{text:JSON.stringify(calls.length===1?bad:{...reply,grade:'A*',provenance:'real_world',observedObject:'invented object'})}]};}}};
 const result=await grade(image,floors['cavity-filling-caramels'],false,undefined,{client});
 assert.equal(calls.length,2);assert.equal(result.grade,'F');assert.equal(result.observedObject,'a blue ribbon');assert.equal(result.provenance,'uncertain');
 assert.equal(calls[0].messages[0].content[0].type,'image');assert.ok(calls[1].messages[0].content.every(c=>c.type==='text'));
 assert.match(calls[1].messages[0].content[0].text,/Aim for 25-40 words total/);
 assert.ok(calls[1].messages[0].content[0].text.includes(JSON.stringify(bad.response)));
 assert.equal(result.response,reply.response);
});
test('a failed wording repair stays bounded and does not manufacture a passing verdict',async()=>{
 let calls=0;const client={messages:{create:async()=>{calls++;return {content:[{text:JSON.stringify({...reply,response:'Too short.'})}]};}}};
 await assert.rejects(grade(image,floors['cavity-filling-caramels'],false,undefined,{client}),/could not finish a clear verdict/);assert.equal(calls,2);
});
