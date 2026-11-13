import { type ReactNode, useId } from 'react';

interface FormSectionProps {
    title: string;
    description?: string;
    children: ReactNode;
}

/** A form section: label column on the left from md up, stacked above the fields on phones. */
export function FormSection({ title, description, children }: FormSectionProps) {
    const id = useId();

    return (
        <section
            aria-labelledby={id}
            className="grid grid-cols-1 gap-3 border-b border-border py-6 first:pt-0 last:border-b-0 md:grid-cols-[12rem_1fr] md:gap-6"
        >
            <div>
                <h2 id={id} className="text-base font-semibold">
                    {title}
                </h2>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            <div className="min-w-0 space-y-4">{children}</div>
        </section>
    );
}
