/** One fallback decision per command; a new command starts with Jev again. */
export class Handover {
 failures=0; active=false; calls=0;
 constructor(readonly available:boolean){}
 progress(changed:boolean){this.failures=changed?0:this.failures+1;}
 enter(){if(this.available&&!this.active&&this.calls===0&&this.failures>=3){this.active=true;this.failures=0;return true;}return false;}
 complete(){this.active=false;this.failures=0;}
 get exhausted(){return this.calls>0&&this.failures>=3;}
 reset(){this.failures=0;this.active=false;this.calls=0;}
}
