import { Input } from '@/components/ui/input';

interface OptionalNumberFieldProps {
    name: string;
    value?: number | null;
    onChange: (value: number | undefined) => void;
    onBlur: () => void;
    ref: React.Ref<HTMLInputElement>;
}

type OptionalNumberInputProps = {
    field: OptionalNumberFieldProps;
} & Omit<React.ComponentProps<typeof Input>, keyof OptionalNumberFieldProps | 'type' | 'step' | 'min'>;

export const OptionalNumberInput: React.FC<OptionalNumberInputProps> = ({ field, ...props }) => (
    <Input
        type="number"
        step="1"
        min="0"
        {...props}
        {...field}
        value={field.value ?? ''}
        onChange={(e) => {
            const value = e.target.value;
            field.onChange(value === '' ? undefined : Number(value));
        }}
    />
);
