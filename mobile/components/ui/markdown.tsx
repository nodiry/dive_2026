import { Fragment } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/txt';
import { Colors, FontFamily, FontSize, MONO, Radius, Spacing, Tint } from '@/constants/theme';

type Align = 'left' | 'center' | 'right';

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string; level: number }
  | { kind: 'bullet'; items: string[] }
  | { kind: 'ordered'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'table'; header: string[]; rows: string[][]; align: Align[] }
  | { kind: 'rule' };

const HEADING = /^(#{1,4})\s+(.*)$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const RULE = /^\s*([-*_])\1{2,}\s*$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_DIVIDER = /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/;

function splitCells(line: string): string[] {
  const inner = TABLE_ROW.exec(line);
  const body = inner ? inner[1] : line.replace(/^\s*\|/, '').replace(/\|\s*$/, '');
  return body.split('|').map((cell) => cell.trim());
}

function alignOf(cell: string): Align {
  const trimmed = cell.trim();
  if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
  if (trimmed.endsWith(':')) return 'right';
  return 'left';
}
const INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\n]+\*)/g;

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ').trim() });
      paragraph = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim().startsWith('```')) {
      flush();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }

    if (!line.trim()) {
      flush();
      continue;
    }

    if (
      TABLE_ROW.test(line) &&
      index + 1 < lines.length &&
      TABLE_DIVIDER.test(lines[index + 1]) &&
      lines[index + 1].includes('|')
    ) {
      flush();
      const header = splitCells(line);
      const align = splitCells(lines[index + 1]).map(alignOf);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && TABLE_ROW.test(lines[index])) {
        rows.push(splitCells(lines[index]));
        index += 1;
      }
      index -= 1;
      blocks.push({ kind: 'table', header, rows, align });
      continue;
    }

    if (RULE.test(line)) {
      flush();
      blocks.push({ kind: 'rule' });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: 'heading', text: heading[2], level: heading[1].length });
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      flush();
      blocks.push({ kind: 'quote', text: quote[1] });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'bullet') last.items.push(bullet[1]);
      else blocks.push({ kind: 'bullet', items: [bullet[1]] });
      continue;
    }

    const ordered = ORDERED.exec(line);
    if (ordered) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'ordered') last.items.push(ordered[1]);
      else blocks.push({ kind: 'ordered', items: [ordered[1]] });
      continue;
    }

    paragraph.push(line.trim());
  }

  flush();
  return blocks;
}

function Inline({ text, onDark }: { text: string; onDark?: boolean }) {
  const parts = text.split(INLINE).filter((part) => part !== undefined && part !== '');

  return (
    <>
      {parts.map((part, index) => {
        const key = `${index}-${part.slice(0, 8)}`;

        if (/^(\*\*|__).+(\*\*|__)$/.test(part)) {
          return (
            <Txt key={key} style={[styles.bold, onDark && styles.onDark]}>
              {part.slice(2, -2)}
            </Txt>
          );
        }
        if (/^`.+`$/.test(part)) {
          return (
            <Txt key={key} style={styles.code}>
              {part.slice(1, -1)}
            </Txt>
          );
        }
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (link) {
          return (
            <Txt key={key} style={styles.link} onPress={() => void Linking.openURL(link[2])}>
              {link[1]}
            </Txt>
          );
        }
        if (/^\*[^*]+\*$/.test(part)) {
          return (
            <Txt key={key} style={styles.italic}>
              {part.slice(1, -1)}
            </Txt>
          );
        }
        return <Fragment key={key}>{part}</Fragment>;
      })}
    </>
  );
}

export function Markdown({ text, onDark }: { text: string; onDark?: boolean }) {
  const blocks = parseBlocks(text);

  return (
    <View style={styles.root}>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;

        if (block.kind === 'heading') {
          return (
            <Txt
              key={key}
              variant={block.level <= 2 ? 'heading' : 'subheading'}
              style={[index > 0 && styles.headingSpace, onDark && styles.onDark]}
            >
              <Inline text={block.text} onDark={onDark} />
            </Txt>
          );
        }

        if (block.kind === 'bullet' || block.kind === 'ordered') {
          return (
            <View key={key} style={styles.list}>
              {block.items.map((item, itemIndex) => (
                <View key={`${key}-${itemIndex}`} style={styles.listRow}>
                  <Txt style={[styles.marker, onDark && styles.onDark]}>
                    {block.kind === 'bullet' ? '\u2022' : `${itemIndex + 1}.`}
                  </Txt>
                  <Txt variant="body" style={[styles.listText, onDark && styles.onDark]}>
                    <Inline text={item} onDark={onDark} />
                  </Txt>
                </View>
              ))}
            </View>
          );
        }

        if (block.kind === 'quote') {
          return (
            <View key={key} style={styles.quote}>
              <Txt variant="body" style={styles.quoteText}>
                <Inline text={block.text} onDark={onDark} />
              </Txt>
            </View>
          );
        }

        if (block.kind === 'code') {
          return (
            <View key={key} style={styles.codeBlock}>
              <Txt style={styles.code}>{block.text}</Txt>
            </View>
          );
        }

        if (block.kind === 'table') {
          const columns = Math.max(block.header.length, ...block.rows.map((row) => row.length));
          return (
            <ScrollView
              key={key}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tableScroll}
            >
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  {Array.from({ length: columns }, (_, cell) => (
                    <View key={cell} style={styles.tableCell}>
                      <Txt
                        style={[
                          styles.tableHeadText,
                          { textAlign: block.align[cell] ?? 'left' },
                        ]}
                      >
                        <Inline text={block.header[cell] ?? ''} />
                      </Txt>
                    </View>
                  ))}
                </View>
                {block.rows.map((row, rowIndex) => (
                  <View
                    key={`${key}-${rowIndex}`}
                    style={[styles.tableRow, rowIndex > 0 && styles.tableRowBorder]}
                  >
                    {Array.from({ length: columns }, (_, cell) => (
                      <View key={cell} style={styles.tableCell}>
                        <Txt
                          style={[styles.tableCellText, { textAlign: block.align[cell] ?? 'left' }]}
                        >
                          <Inline text={row[cell] ?? ''} />
                        </Txt>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }

        if (block.kind === 'rule') {
          return <View key={key} style={styles.rule} />;
        }

        return (
          <Txt key={key} variant="body" style={onDark && styles.onDark}>
            <Inline text={block.text} onDark={onDark} />
          </Txt>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.sm },
  bold: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.plum },
  italic: { fontFamily: FontFamily.regular, fontSize: FontSize.base, fontStyle: 'italic' },
  onDark: { color: Colors.lilac },
  code: { fontFamily: MONO, fontSize: FontSize.sm, color: Colors.violetDark },
  codeBlock: {
    backgroundColor: Colors.lilacDim,
    borderRadius: Radius.card,
    padding: Spacing.md,
  },
  link: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.violetDark,
    textDecorationLine: 'underline',
  },
  headingSpace: { marginTop: Spacing.sm },
  list: { gap: 1 },
  listRow: { flexDirection: 'row', gap: Spacing.sm },
  marker: {
    fontFamily: MONO,
    fontSize: FontSize.lg,
    color: Colors.violet,
    minWidth: 16,
    lineHeight: FontSize.base * 1.55,
  },
  listText: { flex: 1 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: Tint.borderViolet,
    paddingLeft: Spacing.md,
  },
  quoteText: { color: Colors.slate },
  tableScroll: { flexGrow: 1 },
  table: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: Tint.border,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  tableRow: { flexDirection: 'row' },
  tableHead: { backgroundColor: Colors.lilacDim },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: Tint.border },
  tableCell: { flex: 1, minWidth: 92, paddingVertical: 9, paddingHorizontal: 11 },
  tableHeadText: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, color: Colors.plum },
  tableCellText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.plum },
  rule: { height: 1, backgroundColor: Tint.border, marginVertical: Spacing.xs },
});
