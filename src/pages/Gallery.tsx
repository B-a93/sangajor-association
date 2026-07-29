import { ArrowRight, CalendarDays, Camera, Film, Images, PlayCircle } from 'lucide-react';
import { PageHero } from '../components/ui/PageHero';
import { galleryAlbums, galleryCategories } from '../data/gallery';
import './Gallery.css';

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

export function Gallery() {
  const featuredAlbum = galleryAlbums.find((album) => album.featured) ?? galleryAlbums[0];
  const recentAlbums = galleryAlbums.filter((album) => album.slug !== featuredAlbum.slug);

  return (
    <>
      <PageHero
        eyebrow="Media Gallery"
        title="Preserving our memories. Celebrating our journey."
        text="Browse a growing collection of photographs and videos documenting the people, programmes and milestones of the SANGAJOR B.C.S. Class of 2008 Association."
      />

      <section className="section gallery-intro-section">
        <div className="section-heading">
          <span className="eyebrow">Explore the Archive</span>
          <h2>Our story, captured together</h2>
          <p>Every album helps preserve the Association’s history and makes our shared journey accessible to members at home and abroad.</p>
        </div>

        <div className="gallery-category-grid">
          {galleryCategories.map((category, index) => (
            <article className="gallery-category-card" key={category.name}>
              <div className="gallery-category-icon">{index % 2 === 0 ? <Camera size={24} /> : <Images size={24} />}</div>
              <h3>{category.name}</h3>
              <p>{category.description}</p>
              <span>View collection <ArrowRight size={16} /></span>
            </article>
          ))}
        </div>
      </section>

      <section className="section muted-section">
        <div className="section-heading">
          <span className="eyebrow">Featured Album</span>
          <h2>A milestone worth remembering</h2>
        </div>

        <article className="featured-gallery-album">
          <div className={`gallery-cover gallery-cover-${featuredAlbum.accent}`}>
            <Camera size={64} strokeWidth={1.4} />
            <span>Featured collection</span>
          </div>
          <div className="featured-gallery-copy">
            <span className="content-category">{featuredAlbum.category}</span>
            <h3>{featuredAlbum.title}</h3>
            <p>{featuredAlbum.description}</p>
            <div className="gallery-album-meta">
              <span><CalendarDays size={18} />{formatDate(featuredAlbum.date)}</span>
              <span><Images size={18} />{featuredAlbum.photoCount} photos</span>
            </div>
            <button className="button" type="button" disabled title="Album viewing will be available when photographs are uploaded">
              View album <ArrowRight size={17} />
            </button>
          </div>
        </article>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Recent Albums</span>
          <h2>More moments from our community</h2>
          <p>Placeholder collections are ready to be replaced with approved Association photographs.</p>
        </div>

        <div className="gallery-album-grid">
          {recentAlbums.map((album) => (
            <article className="gallery-album-card" key={album.slug}>
              <div className={`gallery-cover gallery-cover-${album.accent}`}>
                <Camera size={42} strokeWidth={1.5} />
                <span>{album.category}</span>
              </div>
              <div className="gallery-album-card-copy">
                <span className="content-category">{album.category}</span>
                <h3>{album.title}</h3>
                <p>{album.description}</p>
                <div className="gallery-album-meta compact">
                  <span>{formatDate(album.date)}</span>
                  <span>{album.photoCount} photos</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="gallery-video-section">
        <div className="gallery-video-icon"><PlayCircle size={42} /></div>
        <div>
          <span className="eyebrow light">Video Gallery</span>
          <h2>Association videos are coming soon</h2>
          <p>Future updates will include event highlights, member stories, interviews and Project Legacy 2031 progress videos.</p>
        </div>
        <div className="gallery-video-badge"><Film size={20} />Coming soon</div>
      </section>
    </>
  );
}
