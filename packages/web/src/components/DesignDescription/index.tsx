import { useAuth } from '@imapps/web-utils';

import { addTokenToImageUrls } from '../../utils/imageSrc';
import '../RichTextEditor/styles.css';

interface Props {
    html: string;
}

const DesignDescription: React.FC<Props> = ({ html }) => {
    const { accessToken } = useAuth();

    return (
        <div
            className="tiptap-editor text-sm leading-relaxed"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: single-user app, content is own TipTap output
            dangerouslySetInnerHTML={{ __html: addTokenToImageUrls(html, accessToken) }}
        />
    );
};

export default DesignDescription;
