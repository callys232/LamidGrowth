import content from '../content.json';

export function ExpertHero() {
  const [title, description] = content.hero.paragraphs;
  return (
    <section className="expert-hero">
      <div className="expert-container">
        <h1 data-source-paragraph={title.sourceParagraph}>{title.text}</h1>
        <p className="expert-hero-description" data-source-paragraph={description.sourceParagraph}>
          {description.text}
        </p>
      </div>
    </section>
  );
}
