/** A mode is scoped to one user command. Progress resets failures, not ownership. */
export class Handover {
 failures=0; active=false; calls=0;
 constructor(readonly available:boolean){}
 progress(changed:boolean){this.failures=changed?0:this.failures+1;}
 enter(){if(this.available&&!this.active&&this.failures>=3){this.active=true;this.failures=0;return true;}return false;}
 get exhausted(){return this.active&&(this.failures>=3||this.calls>=8);}
 reset(){this.failures=0;this.active=false;this.calls=0;}
}
