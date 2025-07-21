import 'react-quill/dist/quill.snow.css';

import { Box } from '@mui/material';
import React, { useState } from 'react';
import ReactQuill from 'react-quill';

interface QuillEditorProps {
    value?: string;
    onChange?: (value: string) => void;
}

const TextEditor: React.FC<QuillEditorProps> = ({ value = '', onChange }) => {
    const [editorValue, setEditorValue] = useState<string>(value);

    const handleChange = (content: string) => {
        setEditorValue(content);
        if (onChange) {
            onChange(content);
        }
    };

    return (
        <Box sx={{ minHeight: 300 }}>
            <ReactQuill
                value={editorValue}
                onChange={handleChange}
                theme="snow"
                modules={{
                    toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link'],
                        ['clean'],
                    ]
                }}
                formats={[
                    'header',
                    'bold', 'italic', 'underline', 'strike',
                    'list', 'bullet',
                    'link', 'image',
                ]}
            />
        </Box>
    );
};

export default TextEditor;
