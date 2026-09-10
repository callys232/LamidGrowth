import { useNotificationsPage } from '../hooks/useNotificationsPage';
import { NotificationsHeadingSlide } from '../slides/NotificationsHeadingSlide';
import { NotificationsRemindersSlide } from '../slides/NotificationsRemindersSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Notifications() {
  const page = useNotificationsPage();
  return (
    <>
      <NotificationsHeadingSlide />
      <NotificationsRemindersSlide
        error={page.error}
        items={page.items}
        setItems={page.setItems}
        setError={page.setError}
      />
    </>
  );
}
