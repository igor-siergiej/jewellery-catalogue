import type { Control } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

import MultiImageUpload from '../MultiImageUpload';

interface MakerDocsSectionProps {
    control: Control<any>;
}

const MakerDocsSection: React.FC<MakerDocsSectionProps> = ({ control }) => (
    <div className="space-y-4">
        <FormField
            control={control}
            name="diagramImages"
            render={({ field, fieldState }) => (
                <FormItem>
                    <FormLabel>Diagrams (private — never shown on Etsy)</FormLabel>
                    <FormControl>
                        <MultiImageUpload
                            value={field.value ?? []}
                            onChange={field.onChange}
                            hasError={!!fieldState.error}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={control}
            name="makingNotes"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Making notes (private — never shown on Etsy)</FormLabel>
                    <FormControl>
                        <Textarea
                            placeholder="Steps, measurements, gotchas for making this design again..."
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            rows={4}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    </div>
);

export default MakerDocsSection;
