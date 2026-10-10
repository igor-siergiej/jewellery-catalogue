import { useAuth } from '@imapps/web-utils';
import type { DesignSuggestion, Material } from '@jewellery-catalogue/types';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { makeSuggestDesignFromPhotoRequest } from '@/api/endpoints/designSuggestion';
import { Button } from '@/components/ui/button';
import { ADD_MATERIAL_PAGE } from '@/constants/routes';

interface SuggestFromPhotoProps {
    images: Array<File | string>;
    materials: Material[];
    onSuggestion: (suggestion: DesignSuggestion) => void;
}

const errorMessage = (error: Error): string =>
    error.message.includes('503')
        ? "AI suggestions aren't set up yet. Add FAL_KEY to the API to enable them."
        : "Couldn't get a suggestion from the photo. Your form is unchanged; try again.";

export const SuggestFromPhoto = ({ images, materials, onSuggestion }: SuggestFromPhotoProps) => {
    const { accessToken, login, logout } = useAuth();
    const suggest = useMutation({
        mutationFn: () => makeSuggestDesignFromPhotoRequest(images, () => accessToken, login, logout),
        onSuccess: onSuggestion,
    });
    const nameOf = (id: string) => materials.find((m) => m.id === id)?.name ?? id;
    const suggestion = suggest.data;

    return (
        <div className="space-y-3">
            <Button
                type="button"
                variant="outline"
                disabled={images.length === 0 || suggest.isPending}
                onClick={() => suggest.mutate()}
            >
                {suggest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Suggest from photo
            </Button>

            {suggest.isError && <p className="text-sm text-destructive">{errorMessage(suggest.error)}</p>}

            {suggestion && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2" data-testid="photo-suggestion">
                    <p className="font-medium">Filled in from your photo. Check everything before saving.</p>
                    {suggestion.materials.length > 0 && (
                        <ul className="list-disc pl-5">
                            {suggestion.materials.map((m) => (
                                <li key={m.materialId}>
                                    {nameOf(m.materialId)} × {m.quantity} ({Math.round(m.confidence * 100)}% sure)
                                </li>
                            ))}
                        </ul>
                    )}
                    {suggestion.notInStock.length > 0 && (
                        <div>
                            <p>Not in stock:</p>
                            <ul className="list-disc pl-5">
                                {suggestion.notInStock.map((item) => (
                                    <li key={item.description}>
                                        {item.description}{' '}
                                        <Link
                                            to={ADD_MATERIAL_PAGE.route}
                                            target="_blank"
                                            className="text-primary hover:underline"
                                        >
                                            add material?
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
