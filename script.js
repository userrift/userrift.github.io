const desktop = document.querySelector('#desktop');
const windows = [...document.querySelectorAll('.window')];
const tasks = document.querySelector('#tasks');
const toast = document.querySelector('#toast');
let topZ = 20;

const say = (text) => {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(say.timer);
  say.timer = setTimeout(() => toast.classList.remove('show'), 2400);
};

function focusWindow(win) {
  windows.forEach(w => w.classList.remove('active'));
  win.classList.add('active');
  win.style.zIndex = ++topZ;
}
function taskFor(win) { return tasks.querySelector(`[data-task="${win.id}"]`); }
function ensureTask(win) {
  let task = taskFor(win);
  if (!task) {
    task = document.createElement('button');
    task.className = 'task';
    task.dataset.task = win.id;
    task.textContent = win.querySelector('.titlebar span').textContent;
    task.addEventListener('click', () => {
      const hidden = win.classList.contains('hidden');
      windows.forEach(w => w.classList.add('hidden'));
      if (hidden) { win.classList.remove('hidden'); focusWindow(win); }
    });
    tasks.append(task);
  }
}
function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  win.classList.remove('hidden');
  focusWindow(win);
  ensureTask(win);
  document.querySelector('#startMenu').classList.add('hidden');
}
windows.forEach(win => {
  if (!win.classList.contains('hidden')) ensureTask(win);
  win.addEventListener('pointerdown', () => focusWindow(win));
  win.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const action = btn.dataset.action;
    if (action === 'close') { win.classList.add('hidden'); taskFor(win)?.remove(); }
    if (action === 'minimize') win.classList.add('hidden');
    if (action === 'maximize') win.classList.toggle('maximized');
  }));
});
document.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => openWindow(el.dataset.open)));

// Drag windows.
document.querySelectorAll('.drag-handle').forEach(handle => {
  handle.addEventListener('pointerdown', e => {
    const win = handle.closest('.window');
    if (win.classList.contains('maximized')) return;
    focusWindow(win);
    const rect = win.getBoundingClientRect();
    const dx = e.clientX - rect.left, dy = e.clientY - rect.top;
    handle.setPointerCapture(e.pointerId);
    const move = ev => {
      win.style.left = Math.max(0, Math.min(innerWidth - 120, ev.clientX - dx)) + 'px';
      win.style.top = Math.max(0, Math.min(innerHeight - 80, ev.clientY - dy)) + 'px';
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', () => handle.removeEventListener('pointermove', move), {once:true});
  });
});

// Desktop icon behavior and recycle bin.
const bin = document.querySelector('#recycleBin');
document.querySelectorAll('.draggable').forEach(icon => {
  let start, dragging = false;
  icon.addEventListener('dblclick', e => {
    if (icon.dataset.window) { e.preventDefault(); openWindow(icon.dataset.window); }
  });
  icon.addEventListener('pointerdown', e => {
    start = {x:e.clientX,y:e.clientY,left:icon.offsetLeft,top:icon.offsetTop};
    dragging = false;
    icon.setPointerCapture(e.pointerId);
  });
  icon.addEventListener('pointermove', e => {
    if (!start || Math.hypot(e.clientX-start.x,e.clientY-start.y)<6) return;
    dragging = true;
    const rect = desktop.getBoundingClientRect();
    icon.style.position='fixed'; icon.style.zIndex=50;
    icon.style.left=Math.max(0,Math.min(rect.width-90,start.left+e.clientX-start.x))+'px';
    icon.style.top=Math.max(0,Math.min(rect.height-90,start.top+e.clientY-start.y))+'px';
    const b=bin.getBoundingClientRect();
    bin.classList.toggle('over', e.clientX>b.left&&e.clientX<b.right&&e.clientY>b.top&&e.clientY<b.bottom);
  });
  icon.addEventListener('pointerup', e => {
    if (dragging && bin.classList.contains('over')) {
      icon.classList.add('ghost');
      setTimeout(()=>icon.classList.add('hidden'),180);
      say(`${icon.dataset.name || 'Item'} was moved to the Recycle Bin.`);
      document.querySelector('#binIcon').textContent='🗑️';
    }
    bin.classList.remove('over'); start=null;
  });
});
document.querySelector('#restoreIcons').addEventListener('click',()=>{
  document.querySelectorAll('.draggable').forEach(i=>{i.classList.remove('hidden','ghost');i.style.position='';i.style.left='';i.style.top='';i.style.zIndex='';});
  say('Desktop icons restored.');
});

// Start menu and clock.
const startMenu=document.querySelector('#startMenu');
document.querySelector('#startButton').addEventListener('click',()=>startMenu.classList.toggle('hidden'));
desktop.addEventListener('pointerdown',e=>{if(!e.target.closest('.start-menu')&&!e.target.closest('#startButton'))startMenu.classList.add('hidden')});
const updateClock=()=>document.querySelector('#clock').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});updateClock();setInterval(updateClock,1000);

// Music player.
const audio=document.querySelector('#audio'), play=document.querySelector('#playButton'), vinyl=document.querySelector('#vinyl'), seek=document.querySelector('#seek'), status=document.querySelector('#playerStatus');
function syncPlayer(){const playing=!audio.paused;play.textContent=playing?'❚❚':'▶';vinyl.classList.toggle('playing',playing)}
play.addEventListener('click',async()=>{try{audio.paused?await audio.play():audio.pause()}catch{status.textContent='No repo MP3 found yet. Choose a local MP3 or add music/song.mp3.';say('Add music/song.mp3 to enable the default track.')}});
audio.addEventListener('play',syncPlayer);audio.addEventListener('pause',syncPlayer);audio.addEventListener('error',()=>status.textContent='Waiting for music/song.mp3 — or choose a local MP3.');
audio.addEventListener('timeupdate',()=>{if(audio.duration)seek.value=audio.currentTime/audio.duration*100});seek.addEventListener('input',()=>{if(audio.duration)audio.currentTime=seek.value/100*audio.duration});
document.querySelector('#filePicker').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;audio.src=URL.createObjectURL(f);document.querySelector('#trackTitle').textContent=f.name;status.textContent='Local preview — not uploaded to GitHub.';audio.play()});

// Mini game.
let score=0; const critter=document.querySelector('#critter');
function moveCritter(){critter.style.left=(8+Math.random()*82)+'%';critter.style.top=(8+Math.random()*72)+'%'}
critter.addEventListener('click',()=>{score++;document.querySelector('#score').textContent=score;moveCritter();if(score===10)say('Achievement unlocked: Desktop Exterminator!')});
document.querySelector('#resetGame').addEventListener('click',()=>{score=0;document.querySelector('#score').textContent='0';moveCritter();say('Mini game reset.')});setInterval(()=>{if(Math.random()>.45)moveCritter()},2600);

// Shutdown gag.
document.querySelector('#shutdown').addEventListener('click',()=>document.querySelector('#shutdownScreen').classList.remove('hidden'));
document.querySelector('#shutdownScreen button').addEventListener('click',()=>location.reload());
document.querySelector('#logoff').addEventListener('click',()=>say('Log off is disabled in this web edition.'));
