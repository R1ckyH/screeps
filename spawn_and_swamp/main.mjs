import { getObjectsByPrototype, findClosestByPath, createConstructionSite } from 'game/utils';
import * as proto from 'game/prototypes';
import * as cons from 'game/constants';
import { } from '/arena';

var cnt = 1;
var autofight = 3;
var first_spawn = true;
var miners = [];
var miners2 = [];
var transer;
var worker;
var healer2;
var healers = [];
var attackers = [];
var ranged_attackers = [];
var attack_start = false;
var enemy;
var spawned = false;
var tower;
var constructionSite;

export function loop() {
    spawned = false;
    var spawn = getObjectsByPrototype(proto.StructureSpawn).find(i => i.my);
    if(miners[cnt - 1] && attackers[cnt - 1] && healers[cnt - 1] && ranged_attackers[cnt - 1]){
        cnt++;
        if(cnt > autofight){
            attack_start = true;
        }
    }
    if(cnt > 2){
        healer2 = movement(healer2, "HEALER2", spawn);
        worker = movement(worker, "WORKER", spawn);
    }
    transer = movement(transer, "TRANSER", spawn)
    tower = getObjectsByPrototype(proto.StructureTower).find(i => i.my);
    if (!constructionSite){
        constructionSite = getObjectsByPrototype(proto.ConstructionSite).find(i => i.my);
        createConstructionSite(spawn.x, spawn.y + 2, proto.StructureTower);
    }else if(tower){
        tower.attack(attack_target(tower));
    }
    for(let i = 0; i < cnt; i++){
        miners[i] = movement(miners[i], "MINER", spawn, i);
        attackers[i] = movement(attackers[i], "ATTACKER", spawn, i);
        healers[i] = movement(healers[i], "HEALER", spawn, i);
        //miners3[i] = movement(miners3[i], "MINER", spawn, i);
        ranged_attackers[i] = movement(ranged_attackers[i], "RANGER", spawn, i);
        //miners2[i] = movement(miners2[i], "MINER", spawn, i);
    }
}

function movement(mycreep, type, spawn, i = 0) {
    if (!mycreep) {
        if (!spawned) {
            spawned = true;
            if(type == "TRANSER"){
                return spawn.spawnCreep(work_arr(2, 0, 4)).object;
            }else if(type == "MINER"){
                //if(first_spawn){
                //    return spawn.spawnCreep(work_arr(2, 0, 4)).object;
                //    //return spawn.spawnCreep(miner_arr(1, 4, 1)).object; for having resources
                //}
                return spawn.spawnCreep(work_arr(8, 0, 5)).object;
            }else if(type == "ATTACKER"){
                if(first_spawn){
                    return spawn.spawnCreep(attack_arr(4, 3, 5)).object;
                }
                return spawn.spawnCreep(attack_arr(9, 6, 5)).object;// 6*50+ 6*80 + 7*10 300 + 480 + 70
            }else if(type == "HEALER"){
                if(first_spawn){
                    return spawn.spawnCreep(heal_arr(3, 3, 0)).object;
                }
                return spawn.spawnCreep(heal_arr(6, 2, 0)).object;
            }else if(type =="HEALER2"){
                return spawn.spawnCreep(heal_arr(1, 3, 0)).object;
            }else if(type == "RANGER"){
                return spawn.spawnCreep(ranged_attack_arr(2, 2, 0)).object;
            }else if(type == "WORKER"){
                first_spawn = false;
                return spawn.spawnCreep(work_arr(10, 4, 2)).object;
            }
        }else{
            return undefined;
        }
    }
    if (mycreep.body == undefined || mycreep.body.hits <= 0) {
        return undefined;
    }
    if (type == "MINER") {
        mining(mycreep, spawn);
    }else if (type == "ATTACKER"){
        attacking(mycreep);
    }else if(type == "HEALER"){
        healing(mycreep, spawn, i);
    }else if(type == "RANGER"){
        ranged_attacking(mycreep, i);
    }else if(type == "WORKER"){
        working(mycreep, spawn);
    }else if(type == "TRANSER"){
        transing(mycreep, spawn);
    }else if(type == "HEALER2"){
        healing2(mycreep, spawn);
    }
    return mycreep;
}

function healing2(mycreep, spawn) {
    var myCreeps = getObjectsByPrototype(proto.Creep).filter(creep => creep.my);
    var myDamagedCreeps = myCreeps.filter(i => i.hits < i.hitsMax && i.body.some(i => i.type == cons.CARRY));
    if (spawn.hits < spawn.hitsMax) {
        myDamagedCreeps[myDamagedCreeps.length] = spawn;
    }
    if (myDamagedCreeps.length > 0){
        attack_start = true;
    }
    var target;
    if (myDamagedCreeps.length == 0){
        target = transer;
    }else{
        target = mycreep.findClosestByPath(myDamagedCreeps);
    }
    mycreep.rangedHeal(target)
    mycreep.moveTo(transer);
}

function healing(mycreep, spawn, i) {
    var myCreeps = getObjectsByPrototype(proto.Creep).filter(creep => creep.my);
    var myDamagedCreeps = myCreeps.filter(i => i.hits < i.hitsMax && !i.body.some(i => i.type == cons.CARRY));
    if (spawn.hits < spawn.hitsMax) {
        myDamagedCreeps[myDamagedCreeps.length] = spawn;
    }
    if (myDamagedCreeps.length > 0){
        attack_start = true;
    }
    var target;
    if (myDamagedCreeps.length == 0){
        myCreeps.push(attackers[i]);
        target = mycreep.findClosestByPath(myCreeps.filter(i => i != mycreep && i != undefined && !i.body.some(i => i.type == cons.CARRY || i.type == cons.HEAL || i.type == cons.RANGED_ATTACK) && !(i.x == spawn.x && i.y == spawn.y)));
    }else{
        target = mycreep.findClosestByPath(myDamagedCreeps);
    }
    if (mycreep.heal(target) == cons.ERR_NOT_IN_RANGE) {
        mycreep.moveTo(target);
    }
}

function attack_target(mycreep){
    return mycreep.findClosestByPath(getObjectsByPrototype(proto.Creep).concat(getObjectsByPrototype(proto.StructureSpawn)).concat(getObjectsByPrototype(proto.StructureTower)).filter(creep => !creep.my));
}

function attacking(mycreep) {
    enemy = attack_target(mycreep);
    if (attack_start && mycreep.attack(enemy) == cons.ERR_NOT_IN_RANGE) {
        mycreep.moveTo(enemy);
    }
}

function ranged_attacking(mycreep, i) {
    if (attack_start){
        if(mycreep.rangedAttack(enemy) == cons.ERR_NOT_IN_RANGE) {
            if(attackers[i]){
                mycreep.moveTo(mycreep.findClosestByPath([enemy, attackers[i]]));
            }else{
                var cache = attackers.filter(i => i != undefined);
                cache.push(enemy)
                mycreep.moveTo(mycreep.findClosestByPath(cache))
            }
        }
    }
}

function working(mycreep, spawn) {
    var targets = getObjectsByPrototype(proto.Source).filter(i => i.energy != 0).concat(getObjectsByPrototype(proto.StructureContainer).filter(i => i.store.getUsedCapacity() != 0)).concat(getObjectsByPrototype(proto.Resource).filter(i => i.amount != 0));
    var target = spawn.findClosestByPath(targets);
    if(!target){
        target = mycreep.findClosestByPath(targets);
    }
    if (mycreep.store.getFreeCapacity(cons.RESOURCE_ENERGY) && target == mycreep.findClosestByPath([target, spawn]) || mycreep.store.getUsedCapacity() == 0) {
        if (mycreep.harvest(target) == cons.ERR_NOT_IN_RANGE || mycreep.withdraw(target, cons.RESOURCE_ENERGY) == cons.ERR_NOT_IN_RANGE) {
            mycreep.moveTo(target);
        }
    } else{
        if (!tower){
            if(mycreep.build(constructionSite) == cons.ERR_NOT_IN_RANGE) {
                mycreep.moveTo(constructionSite);
            }
        }else{
            if(mycreep.transfer(tower, cons.RESOURCE_ENERGY) == cons.ERR_NOT_IN_RANGE){
                mycreep.moveTo(tower);
            }else if (!tower.store.getFreeCapacity(cons.RESOURCE_ENERGY) && spawn.store.getFreeCapacity(cons.RESOURCE_ENERGY)){
                if (mycreep.transfer(spawn, cons.RESOURCE_ENERGY) == cons.ERR_NOT_IN_RANGE){
                    mycreep.moveTo(spawn);
                }
            }
        }
    }
}

function transing(mycreep, spawn) {
    var targets = getObjectsByPrototype(proto.StructureContainer).filter(i => i.store.getUsedCapacity() != 0 && Math.abs(i.y - spawn.y) <= 1 && Math.abs(i.x - spawn.x) <= 4);
    var target = mycreep.findClosestByPath(targets);
    if (mycreep.store.getFreeCapacity(cons.RESOURCE_ENERGY) && targets.length > 0) {
        if (mycreep.harvest(target) == cons.ERR_NOT_IN_RANGE || mycreep.withdraw(target, cons.RESOURCE_ENERGY) == cons.ERR_NOT_IN_RANGE) {
            mycreep.moveTo(target);
        }
    } else{
        if (spawn.store.getFreeCapacity(cons.RESOURCE_ENERGY)){
            if (mycreep.transfer(spawn, cons.RESOURCE_ENERGY) == cons.ERR_NOT_IN_RANGE){
                mycreep.moveTo(spawn);
            }
        }else{
            if(mycreep.transfer(tower, cons.RESOURCE_ENERGY) == cons.ERR_NOT_IN_RANGE){
                mycreep.moveTo(tower);
            }
        }
    }
}

function mining(mycreep, spawn) {
    var targets = getObjectsByPrototype(proto.Source).filter(i => i.energy != 0).concat(getObjectsByPrototype(proto.StructureContainer).filter(i => i.store.getUsedCapacity() != 0 && Math.abs(i.y - spawn.y) > 1 && Math.abs(i.x - spawn.x) > 4)).concat(getObjectsByPrototype(proto.Resource).filter(i => i.amount != 0));
    var target = mycreep.findClosestByPath(targets);
    var storages = getObjectsByPrototype(proto.StructureContainer).filter(i => i.store.getFreeCapacity(cons.RESOURCE_ENERGY) && Math.abs(i.y - spawn.y) <= 1 && Math.abs(i.x - spawn.x) <= 4);
    if (mycreep.hits == mycreep.hitsMax && (mycreep.store.getFreeCapacity(cons.RESOURCE_ENERGY) && targets.length > 0 && target == mycreep.findClosestByPath([target, spawn]) || mycreep.store.getUsedCapacity() == 0)) {
        if (mycreep.harvest(target) == cons.ERR_NOT_IN_RANGE || mycreep.withdraw(target, cons.RESOURCE_ENERGY) == cons.ERR_NOT_IN_RANGE) {
            mycreep.moveTo(target);
        }
    } else{
        if (storages.length != 0){
            var storage = mycreep.findClosestByPath(storages);
            if (mycreep.transfer(storage, cons.RESOURCE_ENERGY) == cons.ERR_NOT_IN_RANGE){
                mycreep.moveTo(storage);
            }
        }else{
            if(mycreep.transfer(tower, cons.RESOURCE_ENERGY) == cons.ERR_NOT_IN_RANGE){
                mycreep.moveTo(tower);
            }
        }
    }
}

function heal_arr(move = 1, heal = 1, tough = 1) {
    var arr = [];
    arr = spawn_array(arr, tough, cons.TOUGH);
    arr = spawn_array(arr, move, cons.MOVE);
    arr = spawn_array(arr, heal, cons.HEAL);
    return arr;
}

function attack_arr(move = 1, attack = 1, tough = 1) {
    var arr = [];
    arr = spawn_array(arr, tough, cons.TOUGH);
    arr = spawn_array(arr, move, cons.MOVE);
    arr = spawn_array(arr, attack, cons.ATTACK);
    return arr;
}

function ranged_attack_arr(move = 1, attack = 1, tough = 1) {
    var arr = [];
    arr = spawn_array(arr, tough, cons.TOUGH);
    arr = spawn_array(arr, move, cons.MOVE);
    arr = spawn_array(arr, attack, cons.RANGED_ATTACK);
    return arr;
}

function work_arr(move = 1, work = 1, carry = 1) {
    var arr = [];
    arr = spawn_array(arr, carry, cons.CARRY);
    arr = spawn_array(arr, work, cons.WORK);
    arr = spawn_array(arr, move, cons.MOVE);
    return arr;
}

function spawn_array(arr, times, type) {
    for (let i = 0; i < times; i++) {
        arr[arr.length] = type;
    }
    return arr;
}