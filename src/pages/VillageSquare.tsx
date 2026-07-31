import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Bell, Bookmark, Flag, Heart, ImagePlus, MessageCircle, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { VillageCategory, VillageComment, VillageNotification, VillagePost } from '../types/village';
import './VillageSquare.css';

const categories: Array<{ value: 'all' | VillageCategory; label: string }> = [
  { value: 'all', label: 'All posts' }, { value: 'update', label: 'Updates' },
  { value: 'celebration', label: 'Celebrations' }, { value: 'opportunity', label: 'Opportunities' },
  { value: 'memory', label: 'Memories' },
];

export function VillageSquare() {
  const [session, setSession] = useState<Session | null>(null);
  const [posts, setPosts] = useState<VillagePost[]>([]);
  const [comments, setComments] = useState<Record<string, VillageComment[]>>({});
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<VillageCategory>('update');
  const [image, setImage] = useState<File | null>(null);
  const [filter, setFilter] = useState<'all' | VillageCategory>('all');
  const [search, setSearch] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [notifications, setNotifications] = useState<VillageNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase.from('village_posts')
      .select('id, author_id, body, category, image_url, created_at, updated_at, author:profiles!village_posts_author_id_fkey(full_name, avatar_url), village_reactions(member_id), village_comments(id), village_bookmarks(member_id)')
      .order('created_at', { ascending: false }).limit(100);
    if (error) setMessage('The Village Square could not be loaded. Please try again.');
    else {
      const records = (data ?? []) as unknown as VillagePost[];
      const hydrated = await Promise.all(records.map(async (post) => {
        if (!post.image_url) return post;
        const { data: signed } = await supabase.storage.from('village-media').createSignedUrl(post.image_url, 3600);
        return { ...post, image_url: signed?.signedUrl ?? null };
      }));
      setPosts(hydrated);
    }
    setLoading(false);
  }, []);

  const loadNotifications = useCallback(async () => {
    const { data } = await supabase.from('village_notifications')
      .select('id, recipient_id, actor_id, post_id, kind, read_at, created_at, actor:profiles!village_notifications_actor_id_fkey(full_name)')
      .order('created_at', { ascending: false }).limit(20);
    setNotifications((data ?? []) as unknown as VillageNotification[]);
  }, []);

  useEffect(() => { void supabase.auth.getSession().then(({ data }) => {
    if (!data.session) window.location.hash = '/login';
    setSession(data.session); if (data.session) { void loadPosts(); void loadNotifications(); }
  }); }, [loadNotifications, loadPosts]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel(`village-ecosystem-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'village_posts' }, () => { void loadPosts(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'village_notifications', filter: `recipient_id=eq.${session.user.id}` }, () => { void loadNotifications(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadNotifications, loadPosts, session]);

  async function openNotifications() {
    const next = !showNotifications; setShowNotifications(next);
    if (next && notifications.some((item) => !item.read_at)) {
      await supabase.rpc('mark_village_notifications_read');
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    }
  }

  const visiblePosts = useMemo(() => posts.filter((post) => {
    const matchesCategory = filter === 'all' || post.category === filter;
    const matchesSearch = post.body.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
      || post.author?.full_name?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
    const isSaved = post.village_bookmarks.some((item) => item.member_id === session?.user.id);
    return matchesCategory && matchesSearch && (!savedOnly || isSaved);
  }), [filter, posts, savedOnly, search, session?.user.id]);

  async function publish(event: FormEvent) {
    event.preventDefault(); const text = body.trim(); if (!session || !text) return;
    setPublishing(true); setMessage(''); let imageUrl: string | null = null;
    if (image) {
      const extension = image.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('village-media').upload(path, image);
      if (uploadError) { setMessage('Your image could not be uploaded. Check that it is under 5 MB.'); setPublishing(false); return; }
      imageUrl = path;
    }
    const { error } = await supabase.from('village_posts').insert({ author_id: session.user.id, body: text, category, image_url: imageUrl });
    if (error) setMessage('Your post could not be published.');
    else { setBody(''); setImage(null); setCategory('update'); setMessage('Your update is now in the Village Square.'); await loadPosts(); }
    setPublishing(false);
  }

  async function toggleFor(post: VillagePost, table: 'village_reactions' | 'village_bookmarks') {
    if (!session) return; const key = table === 'village_reactions' ? 'village_reactions' : 'village_bookmarks';
    const selected = post[key].some((item) => item.member_id === session.user.id); const query = supabase.from(table);
    const { error } = selected ? await query.delete().eq('post_id', post.id).eq('member_id', session.user.id)
      : await query.insert({ post_id: post.id, member_id: session.user.id });
    if (!error) await loadPosts();
  }

  async function loadComments(postId: string) { const { data } = await supabase.from('village_comments')
    .select('id, post_id, author_id, body, created_at, author:profiles!village_comments_author_id_fkey(full_name)')
    .eq('post_id', postId).order('created_at'); setComments((current) => ({ ...current, [postId]: (data ?? []) as unknown as VillageComment[] })); }

  async function addComment(postId: string) { const text = commentDrafts[postId]?.trim(); if (!session || !text) return;
    const { error } = await supabase.from('village_comments').insert({ post_id: postId, author_id: session.user.id, body: text });
    if (!error) { setCommentDrafts((current) => ({ ...current, [postId]: '' })); await loadComments(postId); await loadPosts(); } }

  async function deletePost(post: VillagePost) { if (!session || post.author_id !== session.user.id || !window.confirm('Delete this post and its comments?')) return;
    const { error } = await supabase.from('village_posts').delete().eq('id', post.id).eq('author_id', session.user.id);
    setMessage(error ? 'Your post could not be deleted.' : 'Your post was deleted.'); if (!error) await loadPosts(); }

  async function reportPost(post: VillagePost) { if (!session) return; const reason = window.prompt('Why are you reporting this post? Enter privacy, harassment, misinformation, or other.');
    if (!reason) return; const normalized = reason.trim().toLowerCase(); if (!['privacy', 'harassment', 'misinformation', 'other'].includes(normalized)) { setMessage('Choose privacy, harassment, misinformation, or other.'); return; }
    const { error } = await supabase.from('village_reports').insert({ post_id: post.id, reporter_id: session.user.id, reason: normalized });
    setMessage(error ? 'This concern was already reported or could not be sent.' : 'Thank you. The executive team will review your concern.'); }

  if (!session || loading) return <section className="village-state">Opening the Village Square…</section>;
  return <section className="village-page">
    <header className="village-header"><div><p className="eyebrow">MySANGAJOR Digital Village</p><h1>Village Square</h1><p>Share news, celebrate milestones and stay connected with the Association community.</p></div><div className="village-header-actions"><button className="notification-button" type="button" onClick={() => void openNotifications()} aria-expanded={showNotifications}><Bell size={18} /> Activity {notifications.some((item) => !item.read_at) && <b>{notifications.filter((item) => !item.read_at).length}</b>}</button><a className="secondary-button" href="#/dashboard">Back to dashboard</a></div></header>
    {showNotifications && <section className="notification-panel" aria-label="Village activity"><h2>Recent activity</h2>{notifications.length === 0 ? <p>No activity yet. New comments and celebrations will appear here.</p> : notifications.map((item) => <a href="#/dashboard/village" key={item.id}><span>{item.actor?.full_name || 'A member'} {item.kind === 'reaction' ? 'celebrated your post' : item.kind === 'comment' ? 'commented on your post' : 'sent a moderation update'}</span><time>{new Date(item.created_at).toLocaleDateString()}</time></a>)}</section>}
    <div className="village-layout"><div>
      <form className="village-composer" onSubmit={publish}><div className="composer-heading"><label htmlFor="village-post">Share with the village</label><select aria-label="Post category" value={category} onChange={(event) => setCategory(event.target.value as VillageCategory)}>{categories.slice(1).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><textarea id="village-post" maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="What would you like fellow members to know?" /><div><label className="image-picker"><ImagePlus size={18} /> {image ? image.name : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label>{image && <button className="clear-image" type="button" onClick={() => setImage(null)} aria-label="Remove photo"><X size={17} /></button>}<small>{body.length}/2000</small><button className="primary-button" disabled={!body.trim() || publishing}>{publishing ? 'Publishing…' : 'Publish update'}</button></div></form>
      {message && <p className="village-message" role="status">{message}</p>}
      <div className="village-tools"><label><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the village" /></label><button className={savedOnly ? 'active' : ''} type="button" onClick={() => setSavedOnly((value) => !value)}><Bookmark size={17} /> Saved</button></div>
      <div className="village-filters" aria-label="Filter posts">{categories.map((item) => <button className={filter === item.value ? 'active' : ''} type="button" key={item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
      <div className="village-feed" aria-live="polite">{visiblePosts.length === 0 ? <article className="village-empty"><h2>No posts here yet</h2><p>Try another filter or share something with the village.</p></article> : visiblePosts.map((post) => {
        const reacted = post.village_reactions.some((item) => item.member_id === session.user.id); const saved = post.village_bookmarks.some((item) => item.member_id === session.user.id);
        return <article className="village-post" key={post.id}><header><span className="village-avatar">{post.author?.full_name?.charAt(0).toUpperCase() || 'S'}</span><div><strong>{post.author?.full_name || 'Association member'}</strong><span><time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</time><b className={`category-${post.category}`}>{post.category}</b></span></div><div className="post-options">{post.author_id === session.user.id ? <button type="button" title="Delete post" onClick={() => void deletePost(post)}><Trash2 size={17} /></button> : <button type="button" title="Report post" onClick={() => void reportPost(post)}><Flag size={17} /></button>}</div></header><p>{post.body}</p>{post.image_url && <img className="village-image" src={post.image_url} alt="Shared by the post author" loading="lazy" />}<div className="village-actions"><button className={reacted ? 'reacted' : ''} onClick={() => void toggleFor(post, 'village_reactions')} type="button"><Heart size={17} /> {post.village_reactions.length || 'Celebrate'}</button><button type="button" onClick={() => void loadComments(post.id)}><MessageCircle size={17} /> Comment ({post.village_comments.length})</button><button className={saved ? 'saved' : ''} onClick={() => void toggleFor(post, 'village_bookmarks')} type="button"><Bookmark size={17} /> {saved ? 'Saved' : 'Save'}</button></div>{comments[post.id] && <div className="village-comments">{comments[post.id].map((comment) => <p key={comment.id}><strong>{comment.author?.full_name || 'Member'}</strong> {comment.body}</p>)}<div><input aria-label="Add a comment" maxLength={1000} value={commentDrafts[post.id] ?? ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Add a respectful comment" /><button type="button" onClick={() => void addComment(post.id)}>Send</button></div></div>}</article>;
      })}</div>
    </div><aside className="village-guidelines"><span className="eyebrow">Community promise</span><h2>A welcoming village</h2><p>Keep contributions respectful, helpful and appropriate for all Association members.</p><ul><li>Celebrate one another</li><li>Protect private information</li><li>Use the flag to report concerns</li></ul><a className="moderation-link" href="#/dashboard/village/moderation"><ShieldCheck size={17} /> Executive moderation</a></aside></div>
  </section>;
}
