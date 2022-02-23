import { AABB, vec2}from'./Linear Algebra of Dirac'
import { ColliderBase, CollisionDetectorProp, CollisionDetector, Collider_circle, CollisionGroupMng, CollisionGroup } from'./Collision System'







export function collisionSystemTestFunction() {
	test1();
	test2();
}
function test1() {
	const debug_cont: ColliderBase[] = [];

	const mapHalfSize = 10;
	const testProp = new CollisionDetectorProp(AABB.makeSafely(mapHalfSize, mapHalfSize, -mapHalfSize, -mapHalfSize), 1);
	const groupNames = ["enemy bullet", "enemy", "pl attack", "player"]as const 

	const cgm = new CollisionGroupMng();
	cgm.add(new CollisionGroup(groupNames[0], false, false));
	cgm.add(new CollisionGroup(groupNames[1], false, false));
	cgm.add(new CollisionGroup(groupNames[2], false, false));
	cgm.add(new CollisionGroup(groupNames[3], false, false));
	cgm.setRelation(groupNames[0], groupNames[3], false);
	cgm.setRelation(groupNames[1], groupNames[2], false);
	cgm.initializationFinish();

	const cd = new CollisionDetector(testProp, cgm);

	/*
	step 1, clear the cd, this removes all the added colliders in the last tick. 
	But if no collider is modified nor deleted, this clear call can be cancle safely.
	Anyway, I personnally recommend you add this line and then refill all the colliders into the collision detector again.
	 */
	cd.clear();
	/*
	 Step 2, fill the collision detector with colliders.
	 Notice, the old collision events are moved when you add them to the detector.
	 */
	let
	collider = new Collider_circle(new vec2(5, 1.1), 1, cgm.getGroup("player"));
	cd.add(collider);//This function removes the old events.
	debug_cont.push(collider)
	collider = new Collider_circle(new vec2(5, 1.1), 0.5, cgm.getGroup("enemy bullet"));
	cd.add(collider);
	debug_cont.push(collider)
	collider = new Collider_circle(new vec2(5, 0), 0.5, cgm.getGroup("enemy bullet"));
	cd.add(collider);
	debug_cont.push(collider)
	collider = new Collider_circle(new vec2(4.4, 1.1), 0.5, cgm.getGroup("enemy bullet"));
	cd.add(collider);
	debug_cont.push(collider)
	//Step 3, call the tick function.
	cd.tick();
	/*
	Step 4, all the collision events are only added to the colliders.They don't call any function automatically. 
	It's your job to access the events and decide what to do with them. 
	 */
	let addBreakPointHereInYourCompiller = 123;



}


function test2() {
	const debug_cont: ColliderBase[] = [];

	const mapHalfSize = 10;
	const testProp = new CollisionDetectorProp(AABB.makeSafely(mapHalfSize, mapHalfSize, -mapHalfSize, -mapHalfSize), 1);
	const groupNames = ["self overlap"] as const

	const cgm = new CollisionGroupMng();
	cgm.add(new CollisionGroup(groupNames[0], false, true));
	cgm.initializationFinish();

	const cd = new CollisionDetector(testProp, cgm);

	/*
	step 1, clear the cd, this removes all the added colliders in the last tick. 
	But if no collider is modified nor deleted, this clear call can be cancle safely.
	Anyway, I personnally recommend you add this line and then refill all the colliders into the collision detector again.
	 */
	cd.clear();
	/*
	 Step 2, fill the collision detector with colliders.
	 Notice, the old collision events are moved when you add them to the detector.
	 */
	let
	collider = new Collider_circle(new vec2(0, 0), 1, cgm.getGroup("self overlap"));
	cd.add(collider);
	debug_cont.push(collider)
	collider = new Collider_circle(new vec2(1, 0), 1, cgm.getGroup("self overlap"));
	cd.add(collider);
	debug_cont.push(collider)
	//Step 3, call the tick function.
	cd.tick();
	/*
	Step 4, all the collision events are only added to the colliders.They don't call any function automatically. 
	It's your job to access the events and decide what to do with them. 
	 */
	let addBreakPointHereInYourCompiller = 123;

}
