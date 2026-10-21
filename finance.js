/* Reproduces PLANmy's PMT, rounded monthly interest and adjusted final monthly payment. */
export const round2=n=>Math.round((n+Math.sign(n)*Number.EPSILON)*100)/100;
export function compute({price,fees=0,residual,tin,months}) {
  const p=Number(price),g=Number(fees),rv=Number(residual),t=Number(tin),n=Number(months);
  if(![p,g,rv,t,n].every(Number.isFinite)||p<=0||g<0||rv<0||rv>p+g||t<0||t>1||!Number.isInteger(n)||n<1||n>360)throw Error('Revisa els imports i les condicions de finançament.');
  const principal=p+g,rate=t/12;
  const regular=round2(rate===0?(principal-rv)/n:(principal-rv/Math.pow(1+rate,n))*rate/(1-Math.pow(1+rate,-n)));
  let outstanding=principal,amortSum=0,interestSum=0;
  const rows=[],flows=[-p];
  for(let i=1;i<=n;i++) {
    const begin=outstanding;
    const interest=round2(begin*rate);
    // Excel's last monthly amortization: principal minus sum of the preceding amortizations minus residual.
    const amort=i===n?round2(principal-amortSum-rv):round2(regular-interest);
    const payment=i===n?round2(amort+interest):regular;
    outstanding=round2(begin-amort);
    amortSum=round2(amortSum+amort);
    interestSum=round2(interestSum+interest);
    rows.push({period:i,begin,amort,interest,payment,outstanding});
    flows.push(payment);
  }
  flows.push(rv);
  let low=-0.99,high=1;
  const npv=r=>flows.reduce((sum,flow,i)=>sum+flow/Math.pow(1+r,i),0);
  const flo=npv(low),fhi=npv(high);
  let tae=null;
  if(Number.isFinite(flo)&&Number.isFinite(fhi)&&flo*fhi<=0) {
    for(let i=0;i<110;i++) {const mid=(low+high)/2; if(npv(mid)>0)low=mid;else high=mid;}
    tae=Math.pow(1+(low+high)/2,12)-1;
  }
  return {regular,lastMonthly:rows.at(-1).payment,residual:rv,price:p,fees:g,loan:principal,tin:t,tae,months:n,
    interest:interestSum,creditCost:round2(interestSum+g),owed:round2(principal+interestSum),rows,
    totalPaid:round2(principal+interestSum),flows};
}
