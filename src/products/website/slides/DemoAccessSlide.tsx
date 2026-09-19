import { Link } from 'react-router-dom';

/** Used to call POST /auth/demo and drop the visitor straight into a real /os session with no
 * account at all — a visitor "exploring the workspace" was getting real (if sample) dashboard
 * access. Now points at /demo instead: a public page with no session that runs real tools
 * (POST /engines/:code/demo-run — no charge, no persistence) so a visitor sees one genuine result
 * before ever having an account, rather than a full fake workspace. */
export function DemoAccessSlide() {
  return (
    <section className="section-wrap canonical-controls">
      <Link className="button button-primary" to="/demo">
        Explore the workspace
      </Link>
    </section>
  );
}
