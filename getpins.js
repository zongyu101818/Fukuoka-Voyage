async function getPin(url, ext) {
   let res = await fetch(url);
   let text = await res.text();
   let match = text.match(new RegExp('https://i\\.pinimg\\.com/originals/[^"]+\\' + ext));
   if(match) console.log(match[0]);
   else {
       let m2 = text.match(new RegExp('https://i\\.pinimg\\.com/(736x|564x|474x)/[^"]+\\' + ext));
       if(m2) console.log(m2[0]); else console.log('not found');
   }
}
getPin('https://www.pinterest.com/pin/3729612266966670/', '.jpg').then(() => getPin('https://www.pinterest.com/pin/38210296832059303/', '.gif'));
