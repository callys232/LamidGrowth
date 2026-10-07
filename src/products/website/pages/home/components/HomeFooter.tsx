import { Link } from 'react-router-dom';
import copy from '../footer-copy.json';
import { Brand } from '../../../../../shared/ui/Brand';

const routes: Record<string, string> = {
  'LAMID ONE': '/',
  About: '/about',
  'Who We Serve': '/who-its-for',
  'Portal Experience': '/product/experience',
  Resources: '/resources',
  Support: '/support',
  Contact: '/contact',
};

export function HomeFooter() {
  const groups = [
    { title: 'Explore', items: copy.slice(1, 4) },
    { title: 'Learn', items: copy.slice(4, 7) },
    { title: 'Trust', items: copy.slice(7) },
  ];
  return (
    <footer className="public-footer">
      <div className="footer-top">
        <div>
          <Brand light logo />
          <span data-source-paragraph={copy[0].sourceParagraph}>{copy[0].text}</span>
          <p>Think clearly. Build capability. Make consistent progress.</p>
        </div>
        {groups.map((group) => (
          <nav className="footer-column" key={group.title} aria-label={group.title}>
            <h3>{group.title}</h3>
            {group.items.map(({ text, sourceParagraph }) => (
              <span key={sourceParagraph} data-source-paragraph={sourceParagraph}>
                {routes[text] ? <Link to={routes[text]}>{text}</Link> : text}
              </span>
            ))}
          </nav>
        ))}
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} LAMID ONE</span>
        <span>Progress keeps moving. Control stays with you.</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
