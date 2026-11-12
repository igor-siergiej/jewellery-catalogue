import { useAuth } from '@imapps/web-utils';
import type { Design, ShoppingListLine, ShoppingList as ShoppingListResult } from '@jewellery-catalogue/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, Download, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { getDesignsQuery } from '@/api/endpoints/getDesigns';
import { makeShoppingListRequest } from '@/api/endpoints/productionPlan';
import { DesktopOnly, MobileCard, MobileCardList } from '@/components/MobileCardList';
import { StateView } from '@/components/StateView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ADD_DESIGN_PAGE } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { track } from '@/utils/analytics';

interface TargetRow {
    key: number;
    designId: string;
    variantId: string;
    quantity: number;
}

const SELECT_CLASS =
    'h-11 w-full cursor-pointer rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:h-9';

const money = (value: number) => `£${value.toFixed(2)}`;
const amount = (line: ShoppingListLine, value: number) => `${value} ${line.unit}`;

const toText = (list: ShoppingListResult) =>
    [
        ...list.lines
            .filter((l) => l.packsToBuy > 0)
            .map(
                (l) =>
                    `${l.name} (${l.brand}): ${l.packsToBuy} pack(s) of ${amount(l, l.packSize)}, ${money(l.estimatedCost)}${l.purchaseUrl ? ` - ${l.purchaseUrl}` : ''}`
            ),
        `Total: ${money(list.totalCost)}`,
    ].join('\n');

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const toCsv = (list: ShoppingListResult) =>
    [
        [
            'Material',
            'Brand',
            'Unit',
            'Required',
            'In stock',
            'Shortfall',
            'Pack size',
            'Packs to buy',
            'Price per pack',
            'Estimated cost',
            'Purchase URL',
        ],
        ...list.lines.map((l) => [
            l.name,
            l.brand,
            l.unit,
            l.required,
            l.inStock,
            l.shortfall,
            l.packSize,
            l.packsToBuy,
            l.pricePerPack,
            l.estimatedCost,
            l.purchaseUrl,
        ]),
    ]
        .map((row) => row.map(csvCell).join(','))
        .join('\n');

const downloadCsv = (list: ShoppingListResult) => {
    const url = URL.createObjectURL(new Blob([toCsv(list)], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shopping-list.csv';
    link.click();
    URL.revokeObjectURL(url);
};

const MaterialName = ({ line }: { line: ShoppingListLine }) =>
    line.purchaseUrl ? (
        <a
            href={line.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={line.name}
            className="text-primary underline-offset-4 hover:underline"
        >
            {line.name}
        </a>
    ) : (
        <>{line.name}</>
    );

const ShoppingList = () => {
    const { accessToken, login, logout } = useAuth();
    const [rows, setRows] = useState<TargetRow[]>([]);
    const [nextKey, setNextKey] = useState(1);
    const [copied, setCopied] = useState(false);

    const designsQuery = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const designs = designsQuery.data;

    const buildList = useMutation({
        mutationFn: (targets: TargetRow[]) =>
            makeShoppingListRequest(
                {
                    items: targets.map((t) => ({
                        designId: t.designId,
                        variantId: t.variantId || null,
                        quantity: t.quantity,
                    })),
                },
                () => accessToken,
                login,
                logout
            ),
        onSuccess: (_result, targets) => {
            track('shopping_list_built', { count: targets.length });
        },
    });

    if (designsQuery.isError) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="error" what="your designs" onRetry={() => designsQuery.refetch()} />
            </div>
        );
    }

    if (!designs) {
        return (
            <div className="p-4 md:p-6">
                <StateView kind="loading" what="your designs" />
            </div>
        );
    }

    const designsById = new Map<string, Design>(designs.map((d: Design) => [d.id, d]));

    const updateRow = (key: number, changes: Partial<TargetRow>) =>
        setRows((current) => current.map((r) => (r.key === key ? { ...r, ...changes } : r)));

    const addRow = () => {
        const first = designs[0];

        if (!first) return;
        setRows((current) => [
            ...current,
            { key: nextKey, designId: first.id, variantId: first.variants?.[0]?.id ?? '', quantity: 1 },
        ]);
        setNextKey((k) => k + 1);
    };

    const canBuild = rows.length > 0 && rows.every((r) => r.quantity > 0);
    const list = buildList.data;

    const handleCopy = async () => {
        if (!list) return;
        await navigator.clipboard.writeText(toText(list));
        setCopied(true);
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div>
                <h1 className="font-display text-3xl font-semibold">Shopping list</h1>
                <p className="text-sm text-muted-foreground">
                    Pick the designs you want to make and how many. The list shows what's missing from your stock, in
                    whole packs.
                </p>
            </div>

            {designs.length === 0 ? (
                <StateView
                    kind="empty"
                    title="No designs yet"
                    body="Add a design to work out what you need to buy."
                    action={
                        <Button asChild>
                            <Link to={ADD_DESIGN_PAGE.route}>Add design</Link>
                        </Button>
                    }
                />
            ) : (
                <section aria-labelledby="make-heading" className="space-y-3 rounded-lg border bg-card p-4">
                    <h2 id="make-heading" className="text-base font-semibold">
                        What do you want to make?
                    </h2>
                    {rows.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Add a design and a quantity to see what you need to buy.
                        </p>
                    )}
                    {rows.map((row) => {
                        const design = designsById.get(row.designId);
                        const variants = design?.variants ?? [];
                        const hasVariants = variants.length > 0;

                        return (
                            <div
                                key={row.key}
                                className={cn(
                                    'grid grid-cols-1 gap-3 border-t pt-3 first:border-t-0 first:pt-0 sm:items-end',
                                    hasVariants ? 'sm:grid-cols-[2fr_2fr_6rem_auto]' : 'sm:grid-cols-[2fr_6rem_auto]'
                                )}
                                data-testid="shopping-target"
                            >
                                <div className="space-y-1.5">
                                    <Label htmlFor={`design-${row.key}`}>Design</Label>
                                    <select
                                        id={`design-${row.key}`}
                                        className={SELECT_CLASS}
                                        value={row.designId}
                                        onChange={(e) => {
                                            const next = designsById.get(e.target.value);
                                            updateRow(row.key, {
                                                designId: e.target.value,
                                                variantId: next?.variants?.[0]?.id ?? '',
                                            });
                                        }}
                                    >
                                        {designs.map((d: Design) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {hasVariants && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor={`variant-${row.key}`}>Variant</Label>
                                        <select
                                            id={`variant-${row.key}`}
                                            className={SELECT_CLASS}
                                            value={row.variantId}
                                            onChange={(e) => updateRow(row.key, { variantId: e.target.value })}
                                        >
                                            {variants.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <Label htmlFor={`quantity-${row.key}`}>Quantity</Label>
                                    <Input
                                        id={`quantity-${row.key}`}
                                        type="number"
                                        min={1}
                                        className="h-11 md:h-9"
                                        value={row.quantity}
                                        onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) })}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-11 justify-self-end sm:justify-self-auto md:size-9"
                                    aria-label={`Remove ${designsById.get(row.designId)?.name ?? 'item'}`}
                                    onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        );
                    })}
                    <div className="flex flex-wrap gap-2 pt-1">
                        <Button variant="outline" onClick={addRow}>
                            <Plus className="h-4 w-4" /> Add item
                        </Button>
                        <Button
                            onClick={() => {
                                setCopied(false);
                                buildList.mutate(rows);
                            }}
                            disabled={!canBuild || buildList.isPending}
                        >
                            <ShoppingCart className="h-4 w-4" /> Build list
                        </Button>
                    </div>
                    {buildList.isError && (
                        <p role="alert" className="text-sm text-destructive">
                            Couldn't build the list.
                        </p>
                    )}
                </section>
            )}

            {list && (
                <section data-testid="shopping-list-result" className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold">Estimated cost {money(list.totalCost)}</h2>
                            <p className="text-sm text-muted-foreground">
                                {list.lines.some((l) => l.packsToBuy > 0)
                                    ? 'Materials you need to buy are listed first.'
                                    : 'You already have everything you need.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={handleCopy}>
                                <Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <Button variant="outline" onClick={() => downloadCsv(list)}>
                                <Download className="h-4 w-4" /> Download CSV
                            </Button>
                        </div>
                    </div>
                    <MobileCardList>
                        {list.lines.map((line) => (
                            <MobileCard
                                key={line.materialId}
                                title={<MaterialName line={line} />}
                                facts={[
                                    { label: 'Need', value: amount(line, line.required) },
                                    { label: 'In stock', value: amount(line, line.inStock) },
                                    { label: 'Buy', value: `${line.packsToBuy} × ${amount(line, line.packSize)}` },
                                    { label: 'Cost', value: money(line.estimatedCost) },
                                ]}
                            />
                        ))}
                    </MobileCardList>
                    <DesktopOnly className="rounded-md border bg-card">
                        <Table className="min-w-[44rem] table-fixed">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-3">Material</TableHead>
                                    <TableHead data-numeric className="w-28 px-3">
                                        Need
                                    </TableHead>
                                    <TableHead data-numeric className="w-28 px-3">
                                        In stock
                                    </TableHead>
                                    <TableHead data-numeric className="w-28 px-3">
                                        Short by
                                    </TableHead>
                                    <TableHead data-numeric className="w-36 px-3">
                                        Packs to buy
                                    </TableHead>
                                    <TableHead data-numeric className="w-24 px-3">
                                        Cost
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {list.lines.map((line) => (
                                    <TableRow
                                        key={line.materialId}
                                        className={cn(line.packsToBuy === 0 && 'text-muted-foreground')}
                                    >
                                        <TableCell data-name title={line.name} className="px-3 font-medium">
                                            <MaterialName line={line} />
                                        </TableCell>
                                        <TableCell data-numeric className="px-3">
                                            {amount(line, line.required)}
                                        </TableCell>
                                        <TableCell data-numeric className="px-3">
                                            {amount(line, line.inStock)}
                                        </TableCell>
                                        <TableCell data-numeric className="px-3">
                                            {amount(line, line.shortfall)}
                                        </TableCell>
                                        <TableCell data-numeric className="px-3">
                                            {line.packsToBuy} × {amount(line, line.packSize)}
                                        </TableCell>
                                        <TableCell data-numeric className="px-3">
                                            {money(line.estimatedCost)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </DesktopOnly>
                </section>
            )}
        </div>
    );
};

export default ShoppingList;
