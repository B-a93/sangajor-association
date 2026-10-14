-- Keep directory photographs private and link the corrected picture directory.

begin;

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'member-profile-photos';

drop policy if exists "Public profile photographs are readable" on storage.objects;
drop policy if exists "Active members read profile photographs" on storage.objects;
create policy "Active members read profile photographs" on storage.objects
for select to authenticated
using (
  bucket_id = 'member-profile-photos'
  and public.current_member_directory_access()
);

with photo_directory(first_name, last_name, object_path) as (
  values
    ('Bakary','Colley','directory/bakary-colley.webp'),
    ('Banna','Bojang','directory/banna-bojang.webp'),
    ('Ismaila','Manga','directory/ismaila-manga.webp'),
    ('Kaddy','Bojang','directory/kaddy-bojang.webp'),
    ('Demba','Jammeh','directory/demba-jammeh.webp'),
    ('Omar','Bah','directory/omar-bah.webp'),
    ('Landing','Jarju','directory/landing-jarju.webp'),
    ('Saidou','Jallow','directory/saidou-jallow.webp'),
    ('Mbaye','Manga','directory/mbaye-manga.webp'),
    ('Yamundow','Manga','directory/yamundow-manga.webp'),
    ('Fatou','Nyassi','directory/fatou-nyassi.webp'),
    ('Fatou','Badjie','directory/fatou-badjie.webp'),
    ('Oumie','Camara','directory/oumie-camara.webp'),
    ('Mariama Sibo','Bojang','directory/mariama-sibo-bojang.webp'),
    ('Nyima','Gibba','directory/nyima-gibba.webp'),
    ('Sandunding','Manga','directory/sandunding-manga.webp'),
    ('Alieu','Mbaye','directory/alieu-mbaye.webp'),
    ('Rohey','Bojang','directory/rohey-bojang.webp'),
    ('Landing','Bojang','directory/landing-bojang.webp'),
    ('Lamin','Bangura','directory/lamin-bangura.webp'),
    ('Bakary','Bojang','directory/bakary-bojang.webp'),
    ('Mamina','Bojang','directory/mamina-bojang.webp'),
    ('Yusupha','Badjie','directory/yusupha-badjie.webp'),
    ('Salimatou','Bojang','directory/salimatou-bojang.webp'),
    ('Seed M','Bojang','directory/seed-m-bojang.webp'),
    ('Mariama B','Bojang','directory/mariama-b-bojang.webp'),
    ('Edrisa','Bojang','directory/edrisa-bojang.webp'),
    ('Saikou','Bojang','directory/saikou-bojang.webp'),
    ('Abdourahman','Jallow','directory/abdourahman-jallow.webp'),
    ('Sanna','Jarju','directory/sanna-jarju.webp'),
    ('Mamadi','Manga','directory/mamadi-manga.webp'),
    ('Fatou S','Jarju','directory/fatou-s-jarju.webp'),
    ('Lenna','Manga','directory/lenna-manga.webp'),
    ('Wuday','Manga','directory/wuday-manga.webp'),
    ('Abubacarr','Njoku','directory/abubacarr-njoku.webp'),
    ('Pa Yaya','Jarju','directory/pa-yaya-jarju.webp'),
    ('Kaddy','Gibba','directory/kaddy-gibba.webp'),
    ('Tida','Bojang','directory/tida-bojang.webp')
)
update public."Members" m
set profile_photo = p.object_path,
    updated_at = now()
from photo_directory p
where lower(btrim(coalesce(m.first_name, ''))) = lower(p.first_name)
  and lower(btrim(coalesce(m.last_name, ''))) = lower(p.last_name);

commit;
