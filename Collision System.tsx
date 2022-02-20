//Notice. This detection algorithm can only figure out overlapping. It has no idea how the force is generated.
//Only 2 type of detection can be done. Circle vs circle, square vs square.

import { vec2,AABB } from './Linear Algebra of Dirac'

//First thing first. The collision group has to be done first and not modify any more.
type CollisionGroupNames = "player" | "pl attack" | "enemy" | "enemy bullet" | "wall";
class CollisionGroup {
	name: CollisionGroupNames;
	collidesSelf: boolean;
	overlapsSelf: boolean;
	i = -1;//index in the Mng.
	overlap: number[] = [];
	collide: number[] = [];
	overlapNames: string[] = [];
	collideNames: string[] = [];
	constructor(name: CollisionGroupNames, collidesSelf: boolean, overlapsSelf: boolean) {
		this.name = name;
		this.collidesSelf = collidesSelf;
		this.overlapsSelf = overlapsSelf;
	}
	safetyCheck() {
		//This function if not always needed. It helps if the case is very complecated.
		const allNames = this.overlapNames.concat(this.collideNames);
		if (new Set(allNames).size !== allNames.length) { throw new Error("Some name is duplicated in either overlapNames or collideNames.")}
	}
}
class CollisionGroupMng {
	_groups: CollisionGroup[] = [];
	_freeze = false;
	getGroup(name: CollisionGroupNames) {
		return this._groups[this.groupIndexFromName(name)];
	}
	groupIndexFromName(name: CollisionGroupNames) {
		const r = this._groups.findIndex((ele) => name === ele.name);
		//if (r < 0) { throw new Error("Bad param.") };
		return r;
	}
	initializationFinish() {
		this._freeze = true;

		this._groups.forEach((g) => {
			if (g.collidesSelf) {
				g.collide.push(g.i);
			} else {
				if (g.overlapsSelf) {
					g.overlap.push(g.i);
				}
			}
		})

		for (let i1 = 0; i1 < this._groups.length - 1; i1++) {
			const g1 = this._groups[i1];
			for (let i2 = i1 + 1; i2 < this._groups.length; i2++) {
				const g2 = this._groups[i2];

				let r = g1.collideNames.findIndex((ele) => {
					if (ele === g2.name) { return true; } return false;
				});
				if (r < 0) {
					r = g2.collideNames.findIndex((ele) => {
						if (ele === g1.name) { return true; } return false;
					});
				}
				if (r >= 0) {
					g1.collide.push(g2.i);
					g2.collide.push(g1.i);
					continue;
				}

				r = g1.overlapNames.findIndex((ele) => {
					if (ele === g2.name) { return true; } return false;
				});
				if (r < 0) {
					r = g2.overlapNames.findIndex((ele) => {
						if (ele === g1.name) { return true; } return false;
					});
				}
				if (r >= 0) {
					g1.overlap.push(g2.i);
					g2.overlap.push(g1.i);
					continue;
				}
			}//for i2}
		}

		//Cleaning.
		this._groups.forEach((v) => { v.collideNames = []; v.overlapNames = [] });
	}
	add(g: CollisionGroup) {
		{//safety first.
			if (this._freeze) {throw new Error("This manager is already freeze. To add any more collision group, edit this .tsx file.")}

			const r = this._groups.findIndex((group) => {
				if (group === g) { return true; }
				if (group.name === g.name) { return true; }
				return false;
			});
			if (r >= 0) { throw new Error("This collision group is already added.") }
			g.safetyCheck();
		}//safety}
		this._groups.push(g);
		g.i = this._groups.length - 1;
	}
}
const collisionGroupMng = new CollisionGroupMng();


//Add all the group here.
{
	//const groupNames = ["player", "pl attack", "enemy", "enemy bullet", "wall"] as const;
	let g = new CollisionGroup("player",false,false);
	g.overlapNames.push("enemy bullet");
	collisionGroupMng.add(g);
	g = new CollisionGroup("enemy bullet", false, false);
	g.overlapNames.push("player");
	collisionGroupMng.add(g);

	g = new CollisionGroup("enemy", false, false);
	g.overlapNames.push("pl attack");
	collisionGroupMng.add(g);
	g = new CollisionGroup("pl attack", false, false);
	g.overlapNames.push("enemy");
	collisionGroupMng.add(g);

	//g = new CollisionGroup("wall", false, false);
	//g.collideNames.push("player");
	//collisionGroupMng.add(g);

	collisionGroupMng.initializationFinish();

}



//Collision event.
class CollisionEvent {
	other: ColliderBase;
	collision = false;
	constructor( other: ColliderBase, isCollision = false) { this.other =  other; this.collision = isCollision;}
}

//All the collider types.
type typeIndexValues = 1/*circle*/;
abstract class ColliderBase {
	g: CollisionGroup;
	events: Array<CollisionEvent> = [];
	ti: typeIndexValues;//type index. for a collider of type 1 and 2, do 2.detect(1).
	//static = false;to do.
	constructor(p: { g: CollisionGroup, ti: typeIndexValues }) { this.g = p.g; this.ti = p.ti; }
	abstract getAABB():AABB;
}
class Collider_circle extends ColliderBase{
	o: vec2;
	r: number;
	constructor( o: vec2,  r: number,  g: CollisionGroup) {
		super({ g:  g, ti:1 });
		this.o =  o;
		this.r =  r;
	}
	getAABB(): AABB {
		const r = AABB.make(
			this.o.x + this.r,
			this.o.y + this.r,
			this.o.x - this.r,
			this.o.y - this.r,
		);
		return r;
	}
}



//Property structure for the final detector
class CollisionDetectorProp {
	readonly border: AABB;
	readonly minTileSize: number;
	constructor( border: AABB,  minTileSize: number) {
		this.border =  border	  ;
		this.minTileSize =  minTileSize;
		if (this.border.xn >= this.border.x) { throw new Error("bad param") };
		if (this.border.yn >= this.border.y) { throw new Error("bad param") };
		if (this.minTileSize <= 0) { throw new Error("bad param") };
	}
}

//All the detection algorithm
//h === host, g === guest.
//The event
type CollisionAlgoFunc = { (h: ColliderBase, g: ColliderBase): void };
class CollisionAlgo {
	static apply(c1: ColliderBase, c2: ColliderBase) {
		const c = c1.g.collide.includes(c2.g.i);
		const o = c1.g.overlap.includes(c2.g.i);
		if ((!c) && (!o)) { return; }
		if (c1.ti >= c2.ti) {
			const f = CollisionAlgo.funcByTI(c1.ti, c2.ti);
			f(c1, c2);
		} else {
			const f = CollisionAlgo.funcByTI(c2.ti, c1.ti);
			f(c2, c1);
		}
	}
	static funcByTI(ti1_Greater: typeIndexValues, ti2_Smaller: typeIndexValues): CollisionAlgoFunc{
		if (ti1_Greater === 1) {
			return this.a1_1 as CollisionAlgoFunc;
		}
		return this.fallback;
	}
	//circle vs circle.
	static a1_1: CollisionAlgoFunc = function (h: ColliderBase, g: ColliderBase) {
		const H = h as Collider_circle;
		const G = g as Collider_circle;
		const offset = H.o.sub(G.o);
		const sum_r = H.r + G.r;
		if (offset.dot(offset) < (sum_r * sum_r)) {
			H.events.push(new CollisionEvent(G, false));
			G.events.push(new CollisionEvent(H, false));
		}
	}

	static notImplementedYet: CollisionAlgoFunc = function (h: ColliderBase, g: ColliderBase) {
		//If this func is called, also something probably went wrong.
	}
	static fallback: CollisionAlgoFunc = function (h: ColliderBase, g: ColliderBase) { throw new Error("Probably something went wrong in function funcByTI.")}
}

type __CDNodeChildNodeIndex = (0 | 1 | 2 | 3);
class CDNode {
	layer:number;//0 for root node. Positive int for others.
	c: [(CDNode | null),(CDNode | null), (CDNode | null), (CDNode | null)] = [null, null, null, null];// x y, x yn, xn y, xn yn
	d: ColliderBase[] = [];
	border: AABB;
	midpoint: vec2;
	cont: CollisionDetector;
	final: boolean;
	constructor(cont: CollisionDetector, layer: number, border: AABB) {
		this.cont = cont;
		this.layer =  layer;
		this.border = border;
		this.midpoint = this.border.center();
		{
			if ((this.border.x - this.border.xn) / 2 < cont.prop.minTileSize) { this.final = true; }
			else { this.final = false; }
		}
	};
	hasChild(): boolean {
		for (const c in this.c) {
			if (c !== null) { return true;}
		}
		return false;
	}
	innerDetect(){
		if (this.d.length <= 1) { return []; }
		for (var i1 = 0; i1 < this.d.length - 1; i1++) {
			const c1 = this.d[i1];
			for (var i2 = i1+1; i2 < this.d.length; i2++) {
				const c2 = this.d[i2];
				CollisionAlgo.apply(c1, c2);
			}
		}
	}

	add(c: ColliderBase, aabb:AABB = c.getAABB()) {
		const r = aabb.intersect(this.border);
		if (r === null) {
			//If this happens, this should be only in the root node.
			return;
		}
		if (this.final) { this.d.push(c); return;}

		//Now r is AABB.
		// x y, x yn, xn y, xn yn
		if (r.xn > this.midpoint.x) {
			if (r.yn > this.midpoint.y) {
				//add to c[0], x y
				if (this.c[0] === null) {
					const border = AABB.makeSafely(
						this.border.x,
						this.border.y,
						this.midpoint.x,
						this.midpoint.y);
					this.c[0] = new CDNode(this.cont, this.layer + 1, border);
				}
				this.c[0].add(c, aabb);
				return;
			}
			if (r.y < this.midpoint.y) {
				//add to c[1], x yn
				if (this.c[1] === null) {
					const border = AABB.makeSafely(
						this.border.x,
						this.midpoint.y,
						this.midpoint.x,
						this.border.yn);
					this.c[1] = new CDNode(this.cont, this.layer + 1, border);
				}
				this.c[1].add(c, aabb);
				return;
			}
			//the collider intersects with both c[0] and c[1]. It's added to this.
			this.d.push(c);
			return; 
		}
		if (r.x < this.midpoint.x) {
			if (r.yn > this.midpoint.y) {
				//add to c[2], xn y
				if (this.c[2] === null) {
					const border = AABB.makeSafely(
						this.midpoint.x,
						this.border.y,
						this.border.xn,
						this.midpoint.y);
					this.c[2] = new CDNode(this.cont, this.layer + 1, border);
				}
				this.c[2].add(c, aabb);
				return;
			}
			if (r.y < this.midpoint.y) {
				//add to c[3], xn yn
				if (this.c[3] === null) {
					const border = AABB.makeSafely(
						this.midpoint.x,
						this.midpoint.y,
						this.border.xn,
						this.border.yn);
					this.c[3] = new CDNode(this.cont, this.layer + 1, border);
				}
				this.c[3].add(c, aabb);
				return;
			}
			//the collider intersects with both c[0] and c[1]. It's added to this.
			this.d.push(c);
			return;
		}
		this.d.push(c);
		return;
	}
	



}

class CollisionDetector {
	prop: CollisionDetectorProp;
	rootNode: CDNode;
	c: ColliderBase[] = [];
	constructor( prop: CollisionDetectorProp) {
		{
			const w = prop.border.width();
			const h = prop.border.height();
			if (Math.abs(w - h) > (w / 1000)) {
				throw new Error("Please use square. Rect may cause issues.")
			}
		}
		this.prop = prop;
		this.rootNode = new CDNode(this,0,prop.border)
	}
	add(c: ColliderBase) { this.c.push(c);}

	tick() {
		this.rootNode = new CDNode(this, 0, this.prop.border)
		this.c.forEach((c) => {
			this.rootNode.add(c);
		}) 
		this.c = [];

		let n = this.rootNode;
		let i: __CDNodeChildNodeIndex = 0;
		const nodes: CDNode[] = [];
		const ind: __CDNodeChildNodeIndex[] = [];

		while (true) {
			if (n.c[i] !== null) {
				nodes.push(n.c[i]!);
				ind.push(i as __CDNodeChildNodeIndex);
				n = n.c[i]!;
				i = 0;
			}
			else {
				//Now, n.c[i] === null
				if (i < 3) {
					i++;
					continue
				}
				else {
					//Now, n.c[i] === null and i === 3. The last child node is null. This current node is the very leaf node.
					//First, inner test.
					n.innerDetect();
					//Second, cross test with all the colliders from the nodes in path.
					if (n === this.rootNode) { break; }
					for (const guestNodes of nodes) {
						for (const c1 of guestNodes.d) {
							n.d.forEach((c2) => {
								CollisionAlgo.apply(c1, c2);
							})
						}
					}
				}
			}
		}
	}
}

export { Collider_circle, CollisionDetector, CollisionDetectorProp, CollisionEvent, collisionGroupMng, collisionSystemTestFunction };



function collisionSystemTestFunction() {
	test1();
}
function test1() {
	const mapHalfSize = 10;
	const cdp = new CollisionDetectorProp(AABB.makeSafely(mapHalfSize, mapHalfSize, -mapHalfSize, -mapHalfSize), 1);
	const cd = new CollisionDetector(cdp);

	const debug_cont: ColliderBase[] = [];
	let collider = new Collider_circle(new vec2(5, 1.1), 1, collisionGroupMng.getGroup("player"));
	cd.add(collider);
	debug_cont.push(collider)
	collider = new Collider_circle(new vec2(5, 0), 0.5, collisionGroupMng.getGroup("enemy bullet"));
	cd.add(collider);
	debug_cont.push(collider)
	collider = new Collider_circle(new vec2(4.4, 1.1), 0.5, collisionGroupMng.getGroup("enemy bullet"));
	cd.add(collider);
	debug_cont.push(collider)

	cd.tick();

	let fjdksljflkds = 5436546;



}
