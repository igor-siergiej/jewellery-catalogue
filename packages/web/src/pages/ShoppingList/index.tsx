import { useAuth } from '@imapps/web-utils';
import type { Design, ShoppingListLine, ShoppingList as ShoppingListResult } from '@jewellery-catalogue/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, Download, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { getDesignsQuery } from '@/api/endpoints/getDesigns';
import { makeShoppingListRequest } from '@/api/endpoints/productionPlan';
import LoadingScreen from '@/components/Loading';
import { DesktopOnly, MobileCard, MobileCardList } from '@/components/MobileCardList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TargetRow {
    key: number;
    designId: string;
    variantId: string;
    quantity: number;
}

const SELECT_CLASS =
    'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

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

const ShoppingList = () => {
    const { accessToken, login, logout } = useAuth();
    const [rows, setRows] = useState<TargetRow[]>([]);
    const [nextKey, setNextKey] = useState(1);
    const [copied, setCopied] = useState(false);

    const { data: designs } = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

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
    });

    if (!designs) return <LoadingScreen />;

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
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Shopping list</h1>
                <p className="text-sm text-muted-foreground">
                    Pick the designs you want to make and how many. The list shows what's missing from your stock, in
                    whole packs.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>What do you want to make?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {rows.map((row) => {
                        const design = designsById.get(row.designId);
                        const variants = design?.variants ?? [];
                        return (
                            <div
                                key={row.key}
                                className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_2fr_6rem_auto] sm:items-center"
                                data-testid="shopping-target"
                            >
                                <select
                                    aria-label="Design"
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
                                {variants.length > 0 ? (
                                    <select
                                        aria-label="Variant"
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
                                ) : (
                                    <span className="hidden sm:block" />
                                )}
                                <Input
                                    aria-label="Quantity"
                                    type="number"
                                    min={1}
                                    value={row.quantity}
                                    onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) })}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Remove"
                                    onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        );
                    })}
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={addRow} disabled={designs.length === 0}>
                            <Plus className="h-4 w-4" /> Add design
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
                    {buildList.isError && <p className="text-sm text-destructive">Couldn't build the list.</p>}
                </CardContent>
            </Card>

            {list && (
                <Card data-testid="shopping-list-result">
                    <CardHeader>
                        <CardTitle>Estimated cost {money(list.totalCost)}</CardTitle>
                        <CardDescription>
                            {list.lines.some((l) => l.packsToBuy > 0)
                                ? 'Materials you need to buy are listed first.'
                                : 'You already have everything you need.'}
                        </CardDescription>
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={handleCopy}>
                                <Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => downloadCsv(list)}>
                                <Download className="h-4 w-4" /> Download CSV
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <MobileCardList>
                            {list.lines.map((line) => (
                                <MobileCard
                                    key={line.materialId}
                                    title={line.name}
                                    facts={[
                                        { label: 'Need', value: amount(line, line.required) },
                                        { label: 'In stock', value: amount(line, line.inStock) },
                                        { label: 'Buy', value: `${line.packsToBuy} × ${amount(line, line.packSize)}` },
                                        { label: 'Cost', value: money(line.estimatedCost) },
                                    ]}
                                />
                            ))}
                        </MobileCardList>
                        <DesktopOnly>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Material</TableHead>
                                        <TableHead className="text-right">Need</TableHead>
                                        <TableHead className="text-right">In stock</TableHead>
                                        <TableHead className="text-right">Short</TableHead>
                                        <TableHead className="text-right">Packs</TableHead>
                                        <TableHead className="text-right">Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {list.lines.map((line) => (
                                        <TableRow key={line.materialId}>
                                            <TableCell className="font-medium">
                                                {line.purchaseUrl ? (
                                                    <a
                                                        href={line.purchaseUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="hover:underline"
                                                    >
                                                        {line.name}
                                                    </a>
                                                ) : (
                                                    line.name
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">{amount(line, line.required)}</TableCell>
                                            <TableCell className="text-right">{amount(line, line.inStock)}</TableCell>
                                            <TableCell className="text-right">{amount(line, line.shortfall)}</TableCell>
                                            <TableCell className="text-right">
                                                {line.packsToBuy} × {amount(line, line.packSize)}
                                            </TableCell>
                                            <TableCell className="text-right">{money(line.estimatedCost)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </DesktopOnly>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ShoppingList;
