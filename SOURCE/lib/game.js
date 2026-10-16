// Pure deterministic physics. DOM/keyboard/touch input lives in the workshop.
export const WORLD = { width:800, height:360, ground:310, playerSize:28, star:{x:400,y:195}, flag:{x:740,y:310} };
export class Game {
  constructor(settings, lesson='first-star') { this.settings={...settings}; this.lesson=lesson; this.reset(); }
  reset() { this.x=50;this.y=WORLD.ground;this.vy=0;this.elapsed=0;this.score=0;this.collected=false;this.status='ready';this.grounded=true;this.jumpHeld=false; }
  start() { if (['success','error'].includes(this.status)) this.reset(); this.status='running'; }
  stop() { if(this.status==='running') this.status='paused'; }
  tick(dt, input={}) {
    if(this.status!=='running') return;
    dt=Math.min(Math.max(dt,0),0.04); this.elapsed+=dt;
    const previousY=this.y;
    this.x=Math.max(14,Math.min(786,this.x+(Number(!!input.right)-Number(!!input.left))*this.settings.speed*42*dt));
    if(input.jump&&!this.jumpHeld&&this.grounded) {this.vy=-Math.sqrt(2*600*this.settings.jump*34);this.grounded=false;}
    this.jumpHeld=!!input.jump; this.vy+=600*dt;this.y+=this.vy*dt;
    const surfaces=[{left:0,right:800,y:310},{left:330,right:470,y:250}];
    if(this.lesson==='careful-jump') surfaces.push({left:560,right:635,y:245});
    this.grounded=false;
    for(const surface of surfaces) if(this.vy>=0&&this.x+14>surface.left&&this.x-14<surface.right&&previousY<=surface.y+1&&this.y>=surface.y) {this.y=surface.y;this.vy=0;this.grounded=true;break;}
    if(!this.collected&&Math.abs(this.x-WORLD.star.x)<32&&Math.abs(this.y-14-WORLD.star.y)<32) {this.collected=true;this.score=this.settings.starScore;}
    if(this.collected&&this.x>=WORLD.flag.x-20&&this.y>=270) this.status='success';
    if(this.elapsed>=180) this.status='error';
  }
}
