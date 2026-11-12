import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,saveGame,loadGame,restToNextDay} from './game.js';
import {lifeState,eatMeal,choosePet,feedPet} from './life.js';

test('daily meals and pet care persist and become available the next day',()=>{
 const s=createGame();assert.equal(eatMeal(s,'breakfast').ok,true);assert.equal(s.hour,8.25);assert.equal(eatMeal(s,'breakfast').ok,false);assert.equal(eatMeal(s,'lunch').ok,true);assert.equal(s.hour,12.25);assert.equal(eatMeal(s,'dinner').ok,true);assert.equal(s.hour,18.25);
 assert.equal(choosePet(s,'cat').ok,true);assert.equal(feedPet(s).ok,true);assert.equal(feedPet(s).ok,false);
 let data;const storage={setItem:(_,value)=>data=value,getItem:()=>data};saveGame(s,storage);const loaded=loadGame(storage);assert.equal(lifeState(loaded).pet,'cat');assert.equal(lifeState(loaded).meals.lunch,1);assert.equal(feedPet(loaded).ok,false);
 restToNextDay(loaded);assert.equal(eatMeal(loaded,'breakfast').ok,true);assert.equal(feedPet(loaded).ok,true);assert.equal(choosePet(loaded,'dog').ok,true);assert.equal(lifeState(loaded).petFedDay,0);assert.equal(choosePet(loaded,'chicken').ok,true);assert.equal(choosePet(loaded,null).ok,true);assert.equal(feedPet(loaded).ok,false);
});
test('invalid meals and pets do not alter saved choices',()=>{
 const s=createGame();choosePet(s,'dog');assert.equal(choosePet(s,'unknown').ok,false);assert.equal(eatMeal(s,'unknown').ok,false);assert.equal(lifeState(s).pet,'dog');assert.equal(s.hour,8);
});
