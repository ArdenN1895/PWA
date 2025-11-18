const supabase = Supabase.createClient('https://qysovbipmjodfzysczkx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5c292YmlwbWpvZGZ6eXNjemt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTQ5MTMsImV4cCI6MjA3OTAzMDkxM30.N65WTB_jVX6syzFc6FEwmJz9XBcf0hijgnsX83kRxGw.N65WTB_jVX6syzFc6FEwmJz9XBcf0hijgnsX83kRxGw');

let currentUser = null;

// Auth
async function initAuth() {
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    currentUser = data.user;
    if (location.pathname === '/index.html' || location.pathname === '/') location.href = 'home.html';
  } else if (location.pathname !== '/index.html' && location.pathname !== '/') {
    location.href = 'index.html';
  }
}

// Login / Signup
document.getElementById('login')?.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) {
    location.href = 'home.html';
  } else {
    alert('Login Failed: ' + error.message); // Added Error Logging
  }
});

document.getElementById('signup')?.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const displayName = document.getElementById('displayName').value || email.split('@')[0];
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (!error) {
    await supabase.from('profiles').insert({ id: data.user.id, display_name: displayName, username: email.split('@')[0] });
    location.href = 'home.html';
  } else {
    alert('Signup Failed: ' + error.message); // Added Error Logging
  }
});

// Load Feed
async function loadFeed() {
  await initAuth();
  const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id);
  const followingIds = follows ? follows.map(f => f.following_id) : [];
  
  let { data: posts } = await supabase
    .from('posts')
    .select('*, profiles!user_id(*)')
    .or(`user_id.in.(${followingIds}),anonymous.eq.true`)
    .order('created_at', { ascending: false });

  const feed = document.getElementById('feed');
  feed.innerHTML = posts.map(renderPost).join('');
}

// Render single post
function renderPost(p) {
  const isAnon = p.anonymous || !p.profiles;
  const name = isAnon ? 'Anonymous' : p.profiles.display_name;
  const avatar = isAnon ? '' : (p.profiles.avatar_url || 'https://ui-avatars.com/api/?background=333&color=fff&name=' + encodeURIComponent(name));
  
  return `
    <div class="post-card" onclick="location.href='post.html?id=${p.id}'">
      ${!isAnon ? `<div class="flex items-center gap-3"><img class="avatar" src="${avatar}"><div><b>${name}</b><br><small class="text-zinc-500">@${p.profiles.username}</small></div></div>` : '<b>Anonymous</b>'}
      <p class="mt-3 whitespace-pre-wrap">${p.text}</p>
      ${p.image_url ? `<img class="post-img" src="${p.image_url}">` : ''}
      <div class="flex gap-6 mt-4">
        <button onclick="event.stopPropagation(); likePost(${p.id})">❤️ ${p.likes_count || 0}</button>
      </div>
    </div>`;
}

// Like post
async function likePost(postId) {
  await supabase.from('likes').insert({ post_id: postId, user_id: currentUser.id });
  loadFeed(); // simple refresh
}

// Create Post (create.html)
if (location.pathname === '/create.html') {
  document.getElementById('postBtn')?.addEventListener('click', async () => {
    const text = document.getElementById('text').value;
    const anonymous = document.getElementById('anonymous').checked;
    const file = document.getElementById('image').files[0];

    let image_url = null;
    if (file) {
      const { data } = await supabase.storage.from('posts').upload(crypto.randomUUID(), file);
      image_url = supabase.storage.from('posts').getPublicUrl(data.path).data.publicUrl;
    }

    await supabase.from('posts').insert({
      text,
      user_id: anonymous ? null : currentUser.id,
      anonymous: anonymous,
      image_url
    });
    location.href = 'home.html';
  });
}

// Trending page (trending.html)
async function loadTrending() {
  const { data } = await supabase.rpc('trending_posts'); // simple RPC below
  document.getElementById('feed').innerHTML = data.map(renderPost).join('');
}