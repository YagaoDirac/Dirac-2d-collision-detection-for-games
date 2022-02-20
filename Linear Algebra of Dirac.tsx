
class vec2 {
	x: number;
	y: number;
	constructor( x: number,  y: number) {
		this.x =  x;
		this.y =  y;
	}
	add(v: vec2): vec2 {return new vec2(this.x + v.x, this.y + v.y);}
	sub(v: vec2): vec2 {return new vec2(this.x - v.x, this.y - v.y);}
	mul(a: number): vec2 { return new vec2(this.x * a, this.y * a);}
	div(a: number): vec2 { return new vec2(this.x / a, this.y / a); }
	dot(v: vec2): number {return (this.x * v.x+ this.y * v.y);}
}

//x === x(max). xn === x negative(min)
class AABB {
	x = 0;
	y = 0;
	xn = 0;
	yn = 0;
	width() { return this.x - this.xn;}
	height() { return this.y - this.yn; }
	intersect(g: AABB): AABB|null{
		if (this.x <= g.xn || g.x <= this.xn || this.y <= g.yn || g.y <= this.yn) { return null;}
		const r = new AABB();
		r.xn = Math.max(this.xn, g.xn);
		r.x = Math.min(this.x, g.x);
		r.yn = Math.max(this.yn, g.yn);
		r.y = Math.min(this.y, g.y);
		return r;
	}
	contain(p: vec2): boolean {
		if (this.xn <= p.x && p.x <= this.x && this.yn <= p.y && p.y <= this.y) { return true; }
		return false;
	}
	center(): vec2 { return new vec2((this.x + this.xn) / 2, (this.y + this.yn) / 2); }

	static makeSafely(x: number, y: number, xn: number, yn: number):AABB {
		const r = new AABB();
		r.x = x;
		r.y = y;
		r.xn = xn;
		r.yn = yn;
		return r;
	}
	static make(x: number, y: number, xn: number, yn: number): AABB {
		if (x <= xn) { throw new Error("bad param"); }
		if (y <= yn) { throw new Error("bad param"); }
		return this.makeSafely(x, y, xn, yn);
	}
}








export { vec2, AABB}