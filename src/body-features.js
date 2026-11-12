export const DOOR_TYPES={standard:'侧开门',gullwing:'鸥翼门',scissor:'剪刀门',butterfly:'蝴蝶门',dihedral:'旋翼门'};
export const BODY_FEATURES={special:'特殊车门',gullwing:'鸥翼门',scissor:'剪刀门',butterfly:'蝴蝶门',dihedral:'旋翼门',convertible:'可开合车顶'};

// Visual game mechanisms, selected by model family; not a factory equipment database.
export function bodyFeatures(model){
 const {brand='',name='',styles='',design={}}=model;
 let convertible=model.id==='aero'||design.body==='roadster'||/roadster|spyder|spider|cabriolet|convertible|targa|volante|aperta/i.test(`${name} ${styles}`);
 const gullwingFamily=/Mercedes/.test(brand)&&/300 ?SL|SLS/i.test(name)||brand==='Pagani'&&/Huayra/i.test(name);
 // Combined coupe/roadster directory rows use the signature coupe for gullwing families.
 const gullwingCoupe=gullwingFamily&&design.body!=='roadster'&&!/roadster|spyder|spider|cabriolet|convertible|targa|speedster/i.test(name)&&!/^targa$/i.test(styles);
 if(gullwingCoupe)convertible=false;
 let doors='standard';
 if(model.id==='aero'||brand==='Lamborghini'&&/Countach|Diablo|Murci[eé]lago|Aventador|Revuelto|Centenario|Si[aá]n|Veneno/i.test(name))doors='scissor';
 else if(/Koenigsegg/i.test(brand))doors='dihedral';
 else if(/DeLorean|Bricklin/i.test(brand)||gullwingCoupe)doors='gullwing';
 else if(brand==='McLaren'||brand==='Ferrari'&&/Enzo|LaFerrari/i.test(name)||brand==='BMW'&&/i8/i.test(name)||brand==='Maserati'&&/MC20|MCPURA/i.test(name)||/Mercedes/.test(brand)&&/SLR/i.test(name)||brand==='Pagani'&&/Huayra/i.test(name))doors='butterfly';
 return {doors,convertible,defaultRoofOpen:design.body==='roadster',interactive:model.id!=='r86'};
}

export function matchesBodyFeature(model,feature){
 if(!feature)return true;
 const f=model.features||bodyFeatures(model);
 return feature==='special'?f.interactive&&f.doors!=='standard':feature==='convertible'?f.convertible:f.interactive&&f.doors===feature;
}

