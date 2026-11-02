import type { StreakWidgetProps, TimelineEntry } from './hour-grid';

export type { StreakWidgetProps } from './hour-grid';

const StreakWidget = {
  updateSnapshot(_props: StreakWidgetProps) {},
  updateTimeline(_entries: TimelineEntry[]) {},
  reload() {},
};

export default StreakWidget;
