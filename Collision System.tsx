//Notice. This detection algorithm can only figure out overlapping. It has no idea how the force is generated.
//Only 2 type of detection can be done. Circle vs circle, square vs square.

import { vec2,AABB } from './Linear Algebra of Dirac'

//First thing first. The collision group has to be done first and not modify any more.
type CollisionGroupNames = "player" | "pl attack" | "enemy" | "enemy bullet" | "wall";//|"debug self overlap";
class CollisionGroup {
	name: CollisionGroupNames;
	collidesSelf: boolean;
	overlapsSelf: boolean;
	i = -1;//index in the Mng.
	overlapInd: boolean[] = [];
	collideInd: boolean[] = [];
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
	collides(i: number) { return this.collideInd[i]; }
	overlaps(i: number) { return this.overlapInd[i]; }
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
			for (let i = 0; i < this._groups.length; i++) {
				g.collideInd.push(false);
				g.overlapInd.push(false);
			}

			if (g.collidesSelf) {
				g.collideInd[g.i] = true;
			} else {
				if (g.overlapsSelf) {
					g.overlapInd[g.i] = true;
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
					g1.collideInd[g2.i] = true;
					g2.collideInd[g1.i] = true;
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
					g1.overlapInd[g2.i] = true;
					g2.overlapInd[g1.i] = true;
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
	//The best sequence is according to the number, greater in the front, less in the end.
	let
	g = new CollisionGroup("enemy bullet", false, false);
	g.overlapNames.push("player");
	collisionGroupMng.add(g);
	g = new CollisionGroup("enemy", false, false);
	g.overlapNames.push("pl attack");
	collisionGroupMng.add(g);

	//g = new CollisionGroup("wall", false, false);
	//g.collideNames.push("player");
	//collisionGroupMng.add(g);

	g = new CollisionGroup("pl attack", false, false);
	g.overlapNames.push("enemy");
	collisionGroupMng.add(g);
	g = new CollisionGroup("player", false, false);
	g.overlapNames.push("enemy bullet");
	collisionGroupMng.add(g);

	//g = new CollisionGroup("debug self overlap", false, true);
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
	abstract getAABB(): AABB;
	groupIndex(): number{ return this.g.i; }
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
	

	static apply(c1: ColliderBase, c2: ColliderBase, isCollision:boolean) {
		const c = c1.g.collides(c2.g.i);
		const o = c1.g.overlaps(c2.g.i);
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
type __CDNodeChildNodeIndexWith4 = __CDNodeChildNodeIndex|4;
class CDGroupInNode {
	readonly g: CollisionGroup;
	c: ColliderBase[] = [];
	constructor(g: CollisionGroup) { this.g = g;}
	_clearEvent() {
		this.c.forEach((c) => { c.events = [];})
	}

	static detect(g1: CDGroupInNode, g2: CDGroupInNode, gi1 = g1.g.i, gi2 = g2.g.i) {
		//if ((g1.c.length === 0) || (g2.c.length === 0)) { return;}//A bit duplicated.
		const g1_g = g1.g;
		const isC = g1_g.collides(gi2);
		const isO = g1_g.overlaps(gi2);
		if ((!isC) && (!isO)) { return; }

		g1.c.forEach((c1) => {
			g2.c.forEach((c2) => {
				CollisionAlgo.apply(c1, c2, isC);
			})
		})

	}
	static detectInner(gin: CDGroupInNode, gi: number = gin.g.i) {
		const g = gin.g;
		const isC = g.collidesSelf;
		const isO = g.overlapsSelf;
		if ((!isC) && (!isO)) { return; }
		//if (gin.c.length <= 1) { return; }//A bit duplicated.

		gin.c.forEach((c1, i, arr) => {
			for (let _i = i + 1; _i < arr.length; _i++) {
				const c2 = arr[_i];
				CollisionAlgo.apply(c1, c2, isC);
			}
		})
	}







}
class CDNode {
	layer:number;//0 for root node. Positive int for others.
	c: [(CDNode | null),(CDNode | null), (CDNode | null), (CDNode | null)] = [null, null, null, null];// x y, x yn, xn y, xn yn
	g: CDGroupInNode[] = [];
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
	innerDetect() {
		this.g.forEach((g, gi) => {
			if (g.c.length <= 1) {
				return;
			}
			CDGroupInNode.detectInner(g, gi)

		//	const g = _g.g;
		//	const isC = g.collidesSelf;
		//	const isO = g.overlapsSelf;
		//	if ((!isC) && (!isO)) { return; }
		//	if (_g.c.length <= 1) { return; }
		//
		//	_g.c.forEach((c1, i, arr) => {
		//		for (let _i = i + 1; _i < arr.length; _i++) {
		//			const c2 = arr[_i];
		//			CollisionAlgo.apply(c1, c2, isC);
		//		}
		//	})
		})

		//if (this.g.length <= 1) { return []; }    comment this line or not, both are ok.
		this.g.forEach((g1, gi1, arr) => {
			if (g1.c.length === 0) { return;}
			for (let gi2 = gi1 + 1; gi2 < arr.length; gi2++) {
				const g2 = this.g[gi2];
				if (g2.c.length === 0) { continue;}
				CDGroupInNode.detect(g1, g2, gi1, gi2);


				//const g2 = this.g[gi2];
				//const g1_g = g1.g;
				//const isC = g1_g.collides(gi2);
				//const isO = g1_g.overlaps(gi2);
				//if ((!isC) && (!isO)) { return; }
				//
				//g1.c.forEach((c1) => {
				//	g2.c.forEach((c2) => {
				//		CollisionAlgo.apply(c1, c2, isC);
				//	})
				//})
			}
		})
	}

	add(c: ColliderBase, aabb:AABB = c.getAABB()) {
		const r = aabb.intersect(this.border);
		if (r === null) {
			//If this happens, this should be only in the root node.
			return;
		}
		if (this.final) { this._add(c); return;}

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
			this._add(c);
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
			this._add(c);
			return;
		}
		this._add(c);
		return;
	}
	_add(c: ColliderBase) {
		const i = c.g.i;
		if (this.g.length - 1 <= i) {
			for (let _i = this.g.length; _i <= i; _i++) {
				this.g.push(new CDGroupInNode(collisionGroupMng._groups[_i]));
			}
		}
		this.g[c.g.i].c.push(c);
	}
}

class CollisionDetector {
	prop: CollisionDetectorProp;
	rootNode: CDNode;
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
	add(c: ColliderBase) {
		this.rootNode.add(c);
	}

	clear() {
		this.rootNode = new CDNode(this, 0, this.prop.border)
	}

	tick() {
		let n = this.rootNode;
		let i: __CDNodeChildNodeIndexWith4 = 0;
		const nodes: CDNode[] = [];
		const ind: __CDNodeChildNodeIndex[] = [];
		while (true) {
			let n_c_i:CDNode|null;
			if (i <= 3) { n_c_i = n.c[i]; }
			else { n_c_i = null; }
			//if i === 4, n_c_i is always null.
			if (n_c_i !== null) {
				nodes.push(n);
				n = n_c_i;
				ind.push(i as __CDNodeChildNodeIndex);
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
						if (guestNodes.g.length === 0) { continue; }
						guestNodes.g.forEach((g1, gi1) => {
							if (g1.c.length === 0) { return;}
							n.g.forEach((g2, gi2) => {
								if (g2.c.length === 0) { return;}
								CDGroupInNode.detect(g1, g2, gi1, gi2);

								//const hi = HGIN.g.i;
								//const isC = GGIN.g.collides(hi);
								//const isO = GGIN.g.overlaps(hi);
								//if ((!isC) && (!isO)) { continue; }
								////const gi = GGIN.g.i;
								//
								//GGIN.c.forEach((c1) => {
								//	HGIN.c.forEach((c2) => {
								//		CollisionAlgo.apply(c1, c2, isC);
								//	})
								//})
							})
						})
					}//cross detection
					n = nodes.pop()!;
					i = (ind.pop()! + 1 )as __CDNodeChildNodeIndexWith4;
				}
			}
		}
	}

	

}

export { Collider_circle, CollisionDetector, CollisionDetectorProp, CollisionEvent, collisionGroupMng, collisionSystemTestFunction };



	const debug_cont: ColliderBase[] = [];
function collisionSystemTestFunction() {
	test1();
}
function test1() {
	const mapHalfSize = 10;
	const cdp = new CollisionDetectorProp(AABB.makeSafely(mapHalfSize, mapHalfSize, -mapHalfSize, -mapHalfSize), 1);
	const cd = new CollisionDetector(cdp);

	if (1) {
		let
			collider = new Collider_circle(new vec2(5, 1.1), 1, collisionGroupMng.getGroup("player"));
		cd.add(collider);
		debug_cont.push(collider)
		collider = new Collider_circle(new vec2(5, 1.1), 0.5, collisionGroupMng.getGroup("enemy bullet"));
		cd.add(collider);
		debug_cont.push(collider)
		collider = new Collider_circle(new vec2(5, 0), 0.5, collisionGroupMng.getGroup("enemy bullet"));
		cd.add(collider);
		debug_cont.push(collider)
		collider = new Collider_circle(new vec2(4.4, 1.1), 0.5, collisionGroupMng.getGroup("enemy bullet"));
		cd.add(collider);
		debug_cont.push(collider)
	}

	//If you want to test this, modify line 7 and 139.
	//if (1) {
	//	let
	//	collider = new Collider_circle(new vec2(0, 0), 1, collisionGroupMng.getGroup("debug self overlap"));
	//	cd.add(collider);
	//	debug_cont.push(collider)
	//	collider = new Collider_circle(new vec2(1, 0), 1, collisionGroupMng.getGroup("debug self overlap"));
	//	cd.add(collider);
	//	debug_cont.push(collider)
	//}


	cd.tick();

	let fjdksljflkds = 5436546;



}
