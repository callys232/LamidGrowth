import { HomeCopy, HomeSection } from '../components/HomeSection';
export function HomeClosingSlide() {
  return (
    <HomeSection section={6} className="home-closing-section">
      <HomeCopy section={6} from={2} />
      <p className="home-action-expectation">
        Choose your context, then create an account or explore a sample workspace.
      </p>
    </HomeSection>
  );
}
