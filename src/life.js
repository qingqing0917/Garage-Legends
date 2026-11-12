import {advanceTime} from './game.js';

export const MEALS={breakfast:'早餐',lunch:'午餐',dinner:'晚餐'};
export const PETS={dog:'狗',cat:'猫',chicken:'鸡'};

export function lifeState(state){
 const old=state.life&&typeof state.life==='object'?state.life:{};
 const meals=old.meals&&typeof old.meals==='object'?old.meals:{};
 state.life={pet:Object.hasOwn(PETS,old.pet)?old.pet:null,petFedDay:Number.isInteger(old.petFedDay)?old.petFedDay:0,meals:Object.fromEntries(Object.keys(MEALS).map(key=>[key,Number.isInteger(meals[key])?meals[key]:0]))};
 return state.life;
}
export function eatMeal(state,meal){
 const life=lifeState(state);if(!Object.hasOwn(MEALS,meal))return {ok:false,message:'没有这顿饭。'};
 if(life.meals[meal]===state.day)return {ok:false,message:`今天已经吃过${MEALS[meal]}。`};
 life.meals[meal]=state.day;const mealtime={breakfast:8,lunch:12,dinner:18}[meal];advanceTime(state,Math.max(0,mealtime-state.hour)+.25);return {ok:true,message:`吃了${MEALS[meal]}。`};
}
export function choosePet(state,pet){
 if(pet!==null&&!Object.hasOwn(PETS,pet))return {ok:false,message:'没有这种宠物。'};
 const life=lifeState(state);if(life.pet!==pet){life.pet=pet;life.petFedDay=0;}
 return {ok:true,message:pet?`选择了${PETS[pet]}作为伙伴。`:'暂时不养宠物。'};
}
export function feedPet(state){
 const life=lifeState(state);if(!life.pet)return {ok:false,message:'先选择一只宠物。'};
 if(life.petFedDay===state.day)return {ok:false,message:'今天已经喂过了。'};
 life.petFedDay=state.day;return {ok:true,message:`给${PETS[life.pet]}准备了食物。`};
}
