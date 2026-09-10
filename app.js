let D=JSON.parse(localStorage.getItem('svms')||'{"products":[],"tx":[]}');
let BILL=[];

const $=id=>document.getElementById(id);

function save(){
  localStorage.setItem('svms',JSON.stringify(D));
}

function money(x){
  return '₹'+Number(x||0).toLocaleString('en-IN',{
    minimumFractionDigits:2,
    maximumFractionDigits:2
  });
}

function go(id){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  $(id).classList.add('active');
  render();
  scrollTo(0,0);
}

function esc(s){
  return String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

function render(){

  const ps=D.products;

  $('pc').textContent=ps.length;

  $('uc').textContent=ps.reduce(
    (a,p)=>a+Number(p.stock||0),0
  );

  $('sv').textContent=money(
    ps.reduce((a,p)=>a+p.stock*p.buy,0)
  );

  const day=new Date().toISOString().slice(0,10);

  $('ts').textContent=money(
    D.tx
      .filter(t=>t.type==='OUT' && t.date.slice(0,10)===day)
      .reduce((a,t)=>a+t.qty*t.price,0)
  );

  $('low').innerHTML=ps
    .filter(p=>p.stock<=p.min)
    .map(p=>`
      <div class="item">
        <span>${esc(p.name)}</span>
        <b class="low">${p.stock}</b>
      </div>
    `).join('')
    ||'<div class="box">No low-stock products 🎉</div>';

  const q=($('search')?.value||'').toLowerCase();

  $('list').innerHTML=ps
    .filter(p=>
      (p.name+' '+p.cat+' '+p.bar)
      .toLowerCase()
      .includes(q)
    )
    .map(p=>`
      <div class="item">
        <span>
          <b>${esc(p.name)}</b><br>
          <small>
            ${esc(p.cat||'')}
            ${p.bar?'• '+esc(p.bar):''}
            <br>
            Cost ${money(p.buy)}
            • Retail ${money(p.retail)}
            • Wholesale ${money(p.whole)}
          </small>
        </span>

        <span>
          <b class="${p.stock<=p.min?'low':''}">
            ${p.stock}
          </b>
          <br>
          <button onclick="openP(${p.id})">Edit</button>
        </span>
      </div>
    `).join('')
    ||'<div class="box">No products.</div>';

  ['inP','outP'].forEach(id=>{
    $(id).innerHTML=ps.map(p=>`
      <option value="${p.id}">
        ${esc(p.name)} — Stock ${p.stock}
      </option>
    `).join('');
  });

  refreshBillPrice();
  renderBill();

  const sales=D.tx.filter(t=>t.type==='OUT');

  const rev=sales.reduce(
    (a,t)=>a+t.qty*t.price,0
  );

  const cost=sales.reduce((a,t)=>{
    let p=ps.find(x=>x.id===t.pid);
    return a+t.qty*(p?.buy||0);
  },0);

  const retail=sales
    .filter(t=>t.customerType==='RETAIL')
    .reduce((a,t)=>a+t.qty*t.price,0);

  const wholesale=sales
    .filter(t=>t.customerType==='WHOLESALE')
    .reduce((a,t)=>a+t.qty*t.price,0);

  $('report').innerHTML=`
    Retail sales: <b>${money(retail)}</b><br>
    Wholesale sales: <b>${money(wholesale)}</b><br>
    Total revenue: <b>${money(rev)}</b><br>
    Estimated gross profit: <b>${money(rev-cost)}</b><br>
    Current stock value:
    <b>${money(ps.reduce((a,p)=>a+p.stock*p.buy,0))}</b>
  `;

  $('tx').innerHTML=D.tx
    .slice(0,80)
    .map(t=>{
      let p=ps.find(x=>x.id===t.pid);

      return `
        <div class="item">
          <span>
            ${t.type==='OUT'?'🛒':'📥'}
            <b>${esc(p?.name||'Deleted')}</b><br>
            <small>
              ${new Date(t.date).toLocaleString('en-IN')}
              • ${t.type==='OUT'?t.customerType:''}
              • Qty ${t.qty}
              • ${money(t.qty*t.price)}
            </small>
          </span>
        </div>
      `;
    }).join('')
    ||'<div class="box">No transactions.</div>';
}

function openP(id){

  let p=D.products.find(x=>x.id===id);

  $('id').value=p?.id||'';
  $('name').value=p?.name||'';
  $('cat').value=p?.cat||'';
  $('bar').value=p?.bar||'';

  $('buy').value=p?.buy??'';
  $('retail').value=p?.retail??'';
  $('whole').value=p?.whole??'';

  $('stock').value=p?.stock??0;
  $('stock').disabled=!!p;

  $('min').value=p?.min??5;

  $('modal').classList.add('open');
}

function closeP(){
  $('modal').classList.remove('open');
}

function saveP(e){

  e.preventDefault();

  let id=Number($('id').value);

  let p={
    id:id||Date.now(),
    name:$('name').value.trim(),
    cat:$('cat').value.trim(),
    bar:$('bar').value.trim(),

    buy:+$('buy').value,
    retail:+$('retail').value,
    whole:+$('whole').value,

    stock:+$('stock').value,
    min:+$('min').value
  };

  if(id){

    let i=D.products.findIndex(x=>x.id===id);

    p.stock=D.products[i].stock;

    D.products[i]=p;

  }else{

    D.products.push(p);

    if(p.stock){
      D.tx.unshift({
        pid:p.id,
        type:'IN',
        qty:p.stock,
        price:p.buy,
        note:'Opening stock',
        date:new Date().toISOString()
      });
    }
  }

  save();
  closeP();
  render();
}

function refreshBillPrice(){

  let p=D.products.find(
    x=>x.id===+$('outP').value
  );

  if(!p){
    $('defaultPrice').textContent='₹0';
    return;
  }

  $('defaultPrice').textContent=money(
    $('ctype').value==='RETAIL'
      ?p.retail
      :p.whole
  );
}

function addToBill(e){

  e.preventDefault();

  let pid=+$('outP').value;
  let q=+$('outQ').value;

  let p=D.products.find(x=>x.id===pid);

  let typ=$('ctype').value;

  if(!p || q<=0)
    return alert('Enter valid details');

  let already=BILL
    .filter(x=>x.pid===pid)
    .reduce((a,x)=>a+x.qty,0);

  if(q+already>p.stock)
    return alert(
      'Not enough stock. Available: '+
      (p.stock-already)
    );

  let def=typ==='RETAIL'
    ?p.retail
    :p.whole;

  let raw=$('override').value.trim();

  let price=raw===''?def:+raw;

  if(price<0 || !Number.isFinite(price))
    return alert('Invalid override price');

  BILL.push({
    pid,
    qty:q,
    price,
    customerType:typ
  });

  $('outQ').value='';
  $('override').value='';

  renderBill();
}

function renderBill(){

  let el=$('bill');

  if(!BILL.length){
    el.innerHTML='<b>Current bill is empty.</b>';
    return;
  }

  let total=BILL.reduce(
    (a,x)=>a+x.qty*x.price,0
  );

  let typ=BILL[0].customerType;

  el.innerHTML=
    `<h2>${typ==='RETAIL'?'RETAIL':'WHOLESALE'} BILL</h2>`+

    BILL.map((x,i)=>{

      let p=D.products.find(
        y=>y.id===x.pid
      );

      return `
        <div class="line">
          <span>
            ${esc(p?.name)} × ${x.qty}
            <br>
            <small>${money(x.price)} each</small>
          </span>

          <b>${money(x.qty*x.price)}</b>
        </div>
      `;

    }).join('')+

    `
      <div class="line total">
        <span>Total</span>
        <span>${money(total)}</span>
      </div>

      <button onclick="completeBill()">
        Complete Bill
      </button>

      <button class="secondary"
        onclick="BILL=[];renderBill()">
        Clear Bill
      </button>
    `;
}

function completeBill(){

  if(!BILL.length)
    return;

  const typ=BILL[0].customerType;

  if(BILL.some(x=>x.customerType!==typ))
    return alert(
      'Retail and Wholesale items cannot be mixed in one bill.'
    );

  for(let x of BILL){

    let p=D.products.find(
      y=>y.id===x.pid
    );

    if(!p || x.qty>p.stock)
      return alert(
        'Stock changed; check '+
        (p?.name||'product')
      );
  }

  for(let x of BILL){

    let p=D.products.find(
      y=>y.id===x.pid
    );

    p.stock-=x.qty;

    D.tx.unshift({
      pid:x.pid,
      type:'OUT',
      qty:x.qty,
      price:x.price,
      customerType:typ,
      date:new Date().toISOString(),
      note:'Bill'
    });
  }

  let total=BILL.reduce(
    (a,x)=>a+x.qty*x.price,0
  );

  BILL=[];

  save();
  render();

  alert(
    'Bill saved. Customer-facing bill should show only the final selling price.'
  );
}

function stockIn(e){

  e.preventDefault();

  let pid=+$('inP').value;
  let q=+$('inQ').value;
  let note=$('inN').value;

  let p=D.products.find(
    x=>x.id===pid
  );

  if(!p || q<=0)
    return alert('Enter valid details');

  p.stock+=q;

  D.tx.unshift({
    pid,
    type:'IN',
    qty:q,
    price:p.buy,
    note,
    date:new Date().toISOString()
  });

  save();

  e.target.reset();

  render();

  alert('Stock added');
}

function backup(){

  let a=document.createElement('a');

  a.href=URL.createObjectURL(
    new Blob(
      [JSON.stringify(D)],
      {type:'application/json'}
    )
  );

  a.download='svms_backup.json';

  a.click();
}

$('restore').onchange=e=>{

  let r=new FileReader();

  r.onload=()=>{

    try{

      let x=JSON.parse(r.result);

      if(!x.products || !x.tx)
        throw 0;

      D=x;

      save();
      render();

      alert('Backup restored');

    }catch{

      alert('Invalid backup');
    }
  };

  r.readAsText(e.target.files[0]);
};

function wipe(){

  if(confirm('Delete all inventory data?')){

    D={
      products:[],
      tx:[]
    };

    save();
    render();
  }
}

render();
