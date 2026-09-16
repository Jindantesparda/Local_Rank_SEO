(function(){
  var header=document.querySelector('header');
  if(!header) return 'no header';
  var pill=header.firstElementChild;
  var out=[];
  out.push('viewport='+window.innerWidth+'x'+window.innerHeight);
  out.push('pill scrollWidth='+pill.scrollWidth+' clientWidth='+pill.clientWidth+' -> OVERFLOW='+(pill.scrollWidth>pill.clientWidth+1));
  out.push('body scrollWidth='+document.body.scrollWidth+' -> horizontal page scroll='+(document.body.scrollWidth>window.innerWidth+1));
  var links=Array.prototype.slice.call(header.querySelectorAll('nav a, nav button'));
  out.push('nav links in DOM='+links.length);
  var vis=links.filter(function(l){var r=l.getBoundingClientRect();return r.width>0&&r.height>0;});
  out.push('nav links VISIBLE='+vis.length+' ['+vis.map(function(l){return (l.textContent||'').trim().slice(0,16);}).join(' | ')+']');
  out.push('pill children l-to-r: '+Array.prototype.slice.call(pill.children).map(function(c){
    var r=c.getBoundingClientRect();
    return c.tagName.toLowerCase()+':'+Math.round(r.width)+'px@'+Math.round(r.left);
  }).join(' > '));
  var last=pill.children[pill.children.length-1].getBoundingClientRect();
  out.push('rightmost element ends at x='+Math.round(last.right)+' (pill right edge='+Math.round(pill.getBoundingClientRect().right)+')');
  return out.join('\n');
})()
