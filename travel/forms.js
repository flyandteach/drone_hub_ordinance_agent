/* All document generation happens on the user's device. */
(function(root){
'use strict';
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const cents=x=>Math.round((Number(x||0)+Number.EPSILON)*100);
const dollars=x=>cents(x)/100;
function mileage(line){
 const a=String(line.miles||0),b=String(line.mileage_rate||0);
 function fraction(s){if(!/^\d+(\.\d{1,6})?$/.test(s))throw Error('Mileage values must be nonnegative decimals with at most six decimal places.');const parts=s.split('.');return [BigInt(parts.join('')),10n**BigInt((parts[1]||'').length)]}
 const [an,ad]=fraction(a),[bn,bd]=fraction(b),den=ad*bd,num=an*bn*100n;
 return Number((num+den/2n)/den)/100;
}
function dailyTotal(x){return [x.breakfast,x.lunch,x.dinner,x.lodging,x.other,mileage(x)].reduce((n,v)=>n+cents(v),0)/100}
function totals(d){const daily=d.daily_expenses||[],other=d.other_expenses||[];const sum=key=>daily.reduce((n,x)=>n+cents(x[key]),0)/100;
 const meals=daily.reduce((n,x)=>n+cents(x.breakfast)+cents(x.lunch)+cents(x.dinner),0)/100;
 const mealEstimate=d.subsistence_days!=null&&d.subsistence_rate!=null?dollars(d.subsistence_days*d.subsistence_rate):meals;
 const lodgingEstimate=d.lodging_days!=null&&d.lodging_rate!=null?dollars(d.lodging_days*d.lodging_rate):sum('lodging');
 const dailyCents=daily.reduce((n,x)=>n+cents(dailyTotal(x)),0),otherCents=other.reduce((n,x)=>n+cents(x.amount),0);
 const mileageTotal=daily.reduce((n,x)=>n+cents(mileage(x)),0)/100;
 return {meals,lodging:sum('lodging'),mileage:mileageTotal,other:otherCents/100,daily:dailyCents/100,gross:(dailyCents+otherCents)/100,net:(dailyCents+otherCents-cents(d.travel_advance))/100,allocated:(d.account_codes||[]).reduce((n,x)=>n+cents(x.amount),0)/100,estimate:[d.registration_fee,d.airfare,mealEstimate,lodgingEstimate,mileageTotal,sum('other'),d.request_other_fees].reduce((n,v)=>n+cents(v),0)/100};
}
function validate(d,kind){
 const errors=[],voucher=kind!=='request';
 if(!d.traveler?.name?.trim())errors.push('Traveler name is required.');
 for(const k of ['event_title','destination_city','departure_datetime','return_datetime','meeting_begin_datetime','meeting_end_datetime'])if(!d[k])errors.push(k.replaceAll('_',' ')+' is required.');
 const dates=['departure_datetime','return_datetime','meeting_begin_datetime','meeting_end_datetime'].map(k=>new Date(d[k]));
 if(dates.some(x=>!Number.isFinite(x.getTime())))errors.push('Enter valid trip and meeting dates/times.');
 else{if(dates[1]<dates[0])errors.push('Return must follow departure.');if(dates[3]<dates[2])errors.push('Meeting end must follow meeting start.');}
 const moneyKeys=['registration_fee','airfare','subsistence_rate','lodging_rate','request_other_fees','travel_advance','breakfast','lunch','dinner','lodging','other','amount'];
 for(const o of [d,...(d.daily_expenses||[]),...(d.other_expenses||[]),...(d.account_codes||[])])for(const k of [...moneyKeys,'miles','mileage_rate','subsistence_days','lodging_days'])if(o[k]!=null&&o[k]!==''){
 const n=Number(o[k]);if(!Number.isFinite(n)||n<0||n>100000000)errors.push(k.replaceAll('_',' ')+' must be a finite, nonnegative number.');else if(moneyKeys.includes(k)&&Math.abs(n*100-Math.round(n*100))>0.000001)errors.push(k.replaceAll('_',' ')+' must have at most two decimal places.');}
 if((d.daily_expenses||[]).length>45)errors.push('The voucher supports up to 45 daily lines.');
 if((d.account_codes||[]).length>5)errors.push('The voucher supports up to five account allocations.');
 if((d.other_expenses||[]).length>6)errors.push('The voucher supports up to six other expense details.');
 for(const x of d.daily_expenses||[])if(!/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')||!Number.isFinite(new Date(x.date+'T12:00').getTime()))errors.push('Each daily line needs a valid date.');
 if(voucher){
 if(!d.daily_expenses?.length)errors.push('Add at least one daily expense line.');
 if(!d.traveler?.employee_id)errors.push('Employee ID is required for the voucher.');
 if(!d.rates_confirmed)errors.push('Confirm rates, meal eligibility, and expense entries for the travel dates.');
 if(!errors.length){const t=totals(d);if(!d.account_codes?.length||cents(t.allocated)!==cents(t.gross))errors.push(`Account allocations ($${t.allocated.toFixed(2)}) must equal gross expenses ($${t.gross.toFixed(2)}).`);if(t.net<0)errors.push('Travel advance exceeds expenses.');}
 for(const x of d.daily_expenses||[]){if(x.date<d.departure_datetime?.slice(0,10)||x.date>d.return_datetime?.slice(0,10))errors.push('Expense dates must fall within the trip.');if(x.miles&&!x.mileage_rate)errors.push('Each mileage line needs a rate.');if(x.miles&&!['A','B','C','D'].includes(x.pov_reason?.toUpperCase()))errors.push('Each mileage line needs a POV reason A, B, C, or D.');}
 }
 if(errors.length)throw Error([...new Set(errors)].join('\n'));return totals(d);
}
async function template(name){const r=await fetch('./templates/'+name);if(!r.ok)throw Error('The form template could not be loaded.');return r.arrayBuffer()}
async function requestPDF(d,bytes){
 const t=validate(d,'request'),lib=root.PDFLib,pdf=await lib.PDFDocument.load(bytes||await template('travel_request_template.pdf')),f=pdf.getForm();
 // Remove arithmetic defaults and calculation actions; totals are calculated by this app.
 for(const field of f.getFields()){field.acroField.dict.delete(lib.PDFName.of('AA'));if(field instanceof lib.PDFTextField){field.disableCombing();field.disableRichFormatting();field.setText('');}else if(field instanceof lib.PDFCheckBox)field.uncheck();}
 pdf.catalog.delete(lib.PDFName.of('OpenAction'));f.acroForm.dict.delete(lib.PDFName.of('CO'));
 const text=(name,value)=>{const field=f.getFieldMaybe(name);if(field instanceof lib.PDFTextField)field.setText(value==null?'':String(value));};
 const money=x=>dollars(x).toFixed(2),date=x=>x?x.replace('T',' '):'';
 const values={'NameOfEmployee':d.traveler.name,'Text Field 168':d.event_title,'Text Field 176':d.destination_city,'Text Field 177':date(d.departure_datetime),'Text Field 178':date(d.return_datetime),'Text Field 179':date(d.meeting_begin_datetime),'Text Field 180':date(d.meeting_end_datetime),'RegistrationFee':money(d.registration_fee),'AirFare':money(d.airfare),'dayssubsistence':d.subsistence_days,'dayssubsistenceamount':d.subsistence_rate==null?'':money(d.subsistence_rate),'dayssubsistenceperday':money(d.subsistence_days!=null&&d.subsistence_rate!=null?d.subsistence_days*d.subsistence_rate:t.meals),'dayslodging':d.lodging_days,'dayslodgingamount':d.lodging_rate==null?'':money(d.lodging_rate),'dayslodgingperday':money(d.lodging_days!=null&&d.lodging_rate!=null?d.lodging_days*d.lodging_rate:t.lodging),'vehiclemileage':money(t.mileage+(d.daily_expenses||[]).reduce((n,x)=>n+Number(x.other||0),0)+Number(d.request_other_fees||0)),'totalestimatedcost':money(t.estimate),'Text Field 173':d.comments,'Text Field 128':d.transport_details||d.comments,'Text Field 129':d.hotel_name,'Text Field 130':d.hotel_city,'Text Field 166':d.account_codes?.[0]?.org_code,'Text Field 234':d.traveler.supervisor_name,'Text Field 235':d.traveler.approving_authority_name};
 for(const [k,v] of Object.entries(values))text(k,v);
 const methods=new Set(d.payment_methods||[]);
 for(const [name,selected] of Object.entries({'Check Box 100':d.traveler.remote_worker?.toLowerCase()==='yes','Check Box 82':methods.has('airline'),'Check Box 83':methods.has('car rental'),'Check Box 86':methods.has('train'),'Check Box 87':methods.has('other')||methods.has('parking'),'Check Box 96':d.funding==='WSDOT funded','Check Box 97':d.funding==='Sponsored trip'})){const field=f.getFieldMaybe(name);if(field instanceof lib.PDFCheckBox)selected?field.check():field.uncheck()}
 const font=await pdf.embedFont(lib.StandardFonts.Helvetica);f.updateFieldAppearances(font);
 return pdf.save();
}
function elements(doc,name){return [...doc.getElementsByTagNameNS(NS,name)]}
function serialDate(s){const [y,m,d]=s.split('-').map(Number);return (Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/86400000}
function time(s){if(!s)return null;if(!/^\d{2}:\d{2}(:\d{2})?$/.test(s))throw Error('Enter times as HH:MM.');const [h,m]=s.split(':').map(Number);if(h>23||m>59)throw Error('Invalid time.');return (h*60+m)/1440}
async function voucherXLSX(d,bytes){
 const t=validate(d,'voucher'),zip=await root.JSZip.loadAsync(bytes||await template('133-103_template.xlsx'));
 const parser=new root.DOMParser(),doc=parser.parseFromString(await zip.file('xl/worksheets/sheet1.xml').async('string'),'application/xml');
 const cells=new Map(elements(doc,'c').map(c=>[c.getAttribute('r'),c]));
 function cell(ref){let c=cells.get(ref);if(c)return c;const rowNum=Number(ref.replace(/\D/g,'')),data=elements(doc,'sheetData')[0];let row=elements(doc,'row').find(x=>Number(x.getAttribute('r'))===rowNum);if(!row){row=doc.createElementNS(NS,'row');row.setAttribute('r',rowNum);const next=elements(doc,'row').find(x=>Number(x.getAttribute('r'))>rowNum);data.insertBefore(row,next||null)}c=doc.createElementNS(NS,'c');c.setAttribute('r',ref);const col=s=>[...s.replace(/\d/g,'')].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0);const next=[...row.childNodes].find(x=>x.nodeType===1&&col(x.getAttribute('r'))>col(ref));row.insertBefore(c,next||null);cells.set(ref,c);return c;}
 function set(ref,value,formula){const c=cell(ref);for(const node of [...c.childNodes])if(['v','f','is'].includes(node.localName))c.removeChild(node);c.removeAttribute('t');if(formula){const f=doc.createElementNS(NS,'f');f.textContent=formula;c.appendChild(f)}if(value==null||value==='')return;if(typeof value==='number'){const v=doc.createElementNS(NS,'v');v.textContent=value;c.appendChild(v)}else{c.setAttribute('t','inlineStr');const is=doc.createElementNS(NS,'is'),text=doc.createElementNS(NS,'t');text.textContent=String(value);is.appendChild(text);c.appendChild(is)}}
 const traveler=d.traveler;for(const [ref,val] of Object.entries({'A5':traveler.name_last_first_initial||traveler.name,'AY5':traveler.employee_id,'BP5':traveler.remote_worker,'CH5':traveler.official_station,'A7':traveler.address,'AY7':traveler.city,'BP7':traveler.state,'BU7':traveler.zip_code,'CH7':traveler.official_residence,'A28':d.daily_expenses.length?serialDate([...d.daily_expenses].sort((a,b)=>a.date.localeCompare(b.date)).at(-1).date):null,'Z28':traveler.regular_work_hours,'A30':d.remarks,'A45':traveler.name_last_first_initial||traveler.name,'AY45':traveler.employee_id,'BU45':d.daily_expenses.length?serialDate([...d.daily_expenses].sort((a,b)=>a.date.localeCompare(b.date)).at(-1).date):null,'BV27':dollars(d.travel_advance)}))set(ref,val);
 const rows=[...Array.from({length:12},(_,i)=>10+i),...Array.from({length:33},(_,i)=>48+i)];
 for(const [i,r] of rows.entries()){
 const line=d.daily_expenses[i];const columns=['A','G','J','X','AL','AR','AX','AZ','BB','BD','BK','BP','BU','CB','CH','CN','CU'];for(const col of columns)set(col+r,null);
 if(line){const values=[serialDate(line.date),new Date(line.date+'T12:00').toLocaleDateString('en-US',{weekday:'short'}).slice(0,2),line.trip_from,line.trip_to,time(line.depart),time(line.return_time),dollars(line.breakfast),dollars(line.lunch),dollars(line.dinner),dollars(line.lodging),Number(line.miles||0),Number(line.mileage_rate||0),line.pov_reason,mileage(line),dollars(line.other),dailyTotal(line),line.purpose||d.event_title];for(let c=0;c<columns.length;c++)set(columns[c]+r,values[c]);}
 set('CB'+r,line?mileage(line):0,`ROUND(BK${r}*BP${r},2)`);set('CN'+r,line?dailyTotal(line):0,`SUM(AX${r}:BD${r},CB${r}:CH${r})`);
 }
 const sums=lines=>({AX:lines.reduce((n,x)=>n+cents(x.breakfast)+cents(x.lunch)+cents(x.dinner),0)/100,BD:lines.reduce((n,x)=>n+cents(x.lodging),0)/100,CB:lines.reduce((n,x)=>n+cents(mileage(x)),0)/100,CH:lines.reduce((n,x)=>n+cents(x.other),0)/100,CN:lines.reduce((n,x)=>n+cents(dailyTotal(x)),0)/100});
 const first=sums(d.daily_expenses.slice(0,12)),second=sums(d.daily_expenses.slice(12)),all=sums(d.daily_expenses);
 for(const col of ['AX','BD','CB','CH','CN']){set(col+'22',first[col],col==='AX'?'SUM(AX10:BB21)':`SUM(${col}10:${col}21)`);set(col+'81',second[col],col==='AX'?'SUM(AX48:BB80)':`SUM(${col}48:${col}80)`);set(col+'23',second[col],col+'81');set(col+'25',all[col],`${col}22+${col}23`)}
 const accountColumns={A:'program',G:'work_order',O:'fund',U:'org_code',AA:'unit',AG:'subunit',AJ:'object_code',AP:'activity',AV:'location',BB:'appropriation',BH:'function',BN:'bal_sheet',BT:'amount'};
 for(let i=0;i<5;i++){const a=d.account_codes[i]||{};for(const [col,key] of Object.entries(accountColumns))set(col+(34+i),key==='amount'?dollars(a[key]):key==='function'?(a.function||a.work_op):a[key]);}
 set('BT39',-dollars(d.travel_advance));set('BT40',t.allocated-dollars(d.travel_advance),'SUM(BT34:BT39)');
 for(let i=0;i<6;i++){const e=d.other_expenses[i]||{};for(const [col,val] of Object.entries({BZ:e.date?serialDate(e.date):null,CF:e.paid_to,CY:e.for_what,DS:dollars(e.amount)}))set(col+(34+i),val)}
 set('DS40',t.other,'SUM(DS34:DS39)');set('CN27',t.net,'CN25+DS40-BV27');
 // Signature and approval fields remain blank.
 for(const ref of ['A42','AI43','AU42','BX43','CJ42','DM43'])set(ref,null);
 zip.file('xl/worksheets/sheet1.xml',new root.XMLSerializer().serializeToString(doc));
 const workbook=parser.parseFromString(await zip.file('xl/workbook.xml').async('string'),'application/xml');let calc=elements(workbook,'calcPr')[0];if(!calc){calc=workbook.createElementNS(NS,'calcPr');workbook.documentElement.appendChild(calc)}calc.setAttribute('calcMode','auto');calc.setAttribute('fullCalcOnLoad','1');zip.file('xl/workbook.xml',new root.XMLSerializer().serializeToString(workbook));
 return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
root.TravelForms={totals,validate,mileage,dailyTotal,requestPDF,voucherXLSX};
})(typeof window!=='undefined'?window:globalThis);
