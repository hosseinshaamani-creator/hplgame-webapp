import { config } from '../config.js';
let clientPromise;
export const configured = /^https:\/\/[^/]+\.supabase\.co$/.test(config.supabaseUrl) && !!config.supabaseAnonKey;
export async function getClient() {
  if (!configured) throw new Error('سرویس حساب هنوز تنظیم نشده است. راهنمای اتصال Supabase را ببین.');
  if (!clientPromise) clientPromise = (async () => {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,storage:sessionStorage,flowType:'pkce',autoRefreshToken:true,detectSessionInUrl:true}});
  })();
  try { return await clientPromise; } catch (error) { clientPromise = null; throw error; }
}
export function friendlyError(error) {
  const message=String(error?.message||'');
  if(/email_confirmation_required/i.test(message)) return 'تأیید ایمیل در Supabase غیرفعال است؛ مدیر باید Confirm email را فعال کند.';
  if(/otp_expired|token.*expired|invalid.*token|token.*invalid|token.*used/i.test(message)||error?.code==='otp_expired') return 'کد نادرست یا منقضی شده است. کد تازه بگیر و دوباره تلاش کن.';
  if(/profile_unavailable/i.test(message)) return 'پروفایل دریافت نشد؛ اتصال و اجرای هر دو migration را بررسی کن.';
  if(/Signups not allowed|user not found|signup_disabled|otp_disabled/i.test(message)) return 'ورود انجام نشد؛ ایمیل را بررسی کن یا حساب تازه بساز.';
  if(error?.code==='23505'||/already registered|already exists|duplicate/i.test(message)) return 'این ایمیل یا شماره قبلاً ثبت شده است. وارد حساب شو.';
  if(/Invalid login credentials/i.test(message)) return 'ایمیل یا رمز درست نیست.';
  if(/Email not confirmed/i.test(message)) return 'اول کد تأیید ایمیل را وارد کن.';
  if(/rate limit|too many/i.test(message)||error?.status===429) return 'تلاش‌ها زیاد شده‌اند؛ کمی بعد دوباره امتحان کن.';
  if(/fetch|network|offline/i.test(message)) return 'اتصال برقرار نشد؛ اینترنت را بررسی و دوباره تلاش کن.';
  if(/conflict|version/i.test(message)) return 'نسخه تازه‌تری در حساب وجود دارد. پروژه را دوباره باز کن؛ تغییرات این پنجره را می‌توانی دانلود کنی.';
  if(!configured) return 'حساب آنلاین هنوز فعال نشده است؛ راهنمای اتصال Supabase داخل بسته است.';
  return 'درخواست انجام نشد. دوباره تلاش کن؛ اگر تکرار شد با مدیر تماس بگیر.';
}
export const redirectURL = () => location.origin+location.pathname;
export async function getAccountData() {
  const db=await getClient();
  const {data:{user},error}=await db.auth.getUser(); if(error) throw error;if(!user||!user.email_confirmed_at)return null;
  const results=await Promise.all([db.from('profiles').select('id,email,phone,display_name,full_name,role,onboarding_completed').eq('id',user.id).single(),db.from('projects').select('*').order('updated_at',{ascending:false}),db.from('progress').select('*')]);
  for(const r of results)if(r.error)throw r.error;
  return {user,profile:results[0].data,projects:results[1].data,progress:Object.fromEntries(results[2].data.map(row=>[row.lesson_id,row]))};
}
export async function saveProject(project,userId) {
  const db=await getClient();
  let query;
  if(project.version) query=db.from('projects').update({title:project.title,project_data:project.project_data}).eq('id',project.id).eq('user_id',userId).eq('version',project.version).select().maybeSingle();
  else query=db.from('projects').insert({id:project.id,user_id:userId,title:project.title,project_data:project.project_data}).select().single();
  const {data,error}=await query;if(error)throw error;if(!data)throw new Error('version conflict');return data;
}
export async function recordProgress(lessonId,status,score=0,time=null) {
  const db=await getClient();const {data,error}=await db.rpc('record_progress',{p_lesson:lessonId,p_status:status,p_score:score,p_time:time});if(error)throw error;return data;
}
