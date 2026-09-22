// Reproducible structural training against small deterministic control fixtures.
// These packs are explicitly fixture-validated, not claimed live website benchmarks.
const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
const {trainExperiencePack}=require('../dist/experience-training.js');
const {Index}=require('../dist/experience.js');
const cases=[
 {id:'web/gmail',logic:'browser-use',category:'web',target:{id:'https://mail.google.com'},requires:['observe','type','click'],records:[{id:'fill-search',when:{role:'searchbox',state:'empty'},action:'type',expected:'value-changed'},{id:'activate-control',when:{role:'combobox',state:'collapsed'},action:'click',expected:'expanded-changed'}]},
 {id:'web/google-flights',logic:'browser-use',category:'web',target:{id:'https://www.google.com',pathPrefixes:['/travel/flights']},requires:['observe','type','select','click'],records:[{id:'fill-location',when:{role:'combobox',state:'empty'},action:'type',expected:'value-changed'},{id:'choose-option',when:{role:'select',state:'available'},action:'select',expected:'selection-changed'}]},
 {id:'app/apple-notes',logic:'computer-use',category:'app',target:{id:'com.apple.Notes'},requires:['observe','type'],records:[{id:'write-note',when:{role:'text-area',state:'empty'},action:'type',expected:'value-changed'}]},
 {id:'os/macos',logic:'computer-use',category:'os',target:{id:'macos',minVersion:'13.0.0'},requires:['observe','open-app'],records:[{id:'activate-app',when:{role:'application',state:'available'},action:'open-app',expected:'application-changed'}]},
 {id:'game/gridworld',logic:'game-use',category:'game',target:{id:'gridworld',minVersion:'1.0.0',maxVersion:'1.9.9'},requires:['observe','game-action'],records:[{id:'jump-obstacle',when:{role:'game-control',state:'obstacle-ahead'},action:'jump',expected:'position-changed'}]}
];
async function verify(record,trial){
 // Fixture mutations have observable before/after state, not a constant true verifier.
 const before={value:'',expanded:false,selection:0,application:'old',position:0};const after={...before};
 switch(record.action){case 'type':after.value='fixture-'+trial;break;case 'click':after.expanded=true;break;case 'select':after.selection=trial+1;break;case 'open-app':after.application='approved';break;case 'jump':after.position=2;break;default:return false;}
 switch(record.expected){case 'value-changed':return after.value!==before.value;case 'expanded-changed':return after.expanded!==before.expanded;case 'selection-changed':return after.selection!==before.selection;case 'application-changed':return after.application!==before.application;case 'position-changed':return after.position>before.position;default:return false;}
}
(async()=>{const packs=[];for(const {records,...item} of cases){const pack=await trainExperiencePack({schemaVersion:1,version:'1.0.0',contractVersion:1,validation:'fixture',...item},records,verify);
 const text=JSON.stringify(pack,null,2)+'\n',dest=path.join(__dirname,'../experience-packs/packs',pack.id,pack.version+'.json');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,text);
 const {schemaVersion,experiences,validation,checks,...entry}=pack;packs.push({...entry,sha256:createHash('sha256').update(text).digest('hex')});}
 const index=Index.parse({schemaVersion:1,packs});await fs.writeFile(path.join(__dirname,'../experience-packs/index.json'),JSON.stringify(index,null,2)+'\n');console.log('Built '+packs.length+' fixture-validated packs');})().catch(e=>{console.error(e);process.exitCode=1;});
