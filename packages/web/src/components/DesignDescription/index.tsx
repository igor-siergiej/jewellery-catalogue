import '../RichTextEditor/styles.css';

interface Props {
    html: string;
}

const DesignDescription: React.FC<Props> = ({ html }) => {
    // biome-ignore lint/security/noDangerouslySetInnerHtml: single-user app, content is own TipTap output
    return <div className="tiptap-editor text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
};

export default DesignDescription;
