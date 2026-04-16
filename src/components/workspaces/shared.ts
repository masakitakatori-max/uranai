export interface WorkspaceProps<TInput> {
  input: TInput;
  years: number[];
  daysInMonth: number;
  onApplyNow: () => void;
  onInputChange: (updater: (draft: TInput) => TInput) => void;
}
