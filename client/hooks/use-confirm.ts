import { useConfirmStore, type ConfirmType } from '@/store/useConfirmStore';

export const useConfirm = () => {
  const confirm = useConfirmStore((state) => state.confirm);
  const isOpen = useConfirmStore((state) => state.isOpen);
  const options = useConfirmStore((state) => state.options);
  const onConfirm = useConfirmStore((state) => state.onConfirm);
  const onCancel = useConfirmStore((state) => state.onCancel);

  return { confirm, isOpen, options, onConfirm, onCancel };
};

export { type ConfirmType };
