import React, { useEffect, useState, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { Resizable } from 'react-resizable';
import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import 'react-resizable/css/styles.css';
import KanbanNode from './KanbanNode';
import { auth, db } from '../../firebase';

// ── Limits ────────────────────────────────────────────────────────────────────
const IMAGE_MAX_KB = 200;
const AUDIO_MAX_KB = 5120; // 5 MB
const FIRESTORE_AUDIO_CHUNK_SIZE = 700_000;

// ── GML Syntax Highlighter ────────────────────────────────────────────────────

const GML_KEYWORDS = [
  'var','globalvar','if','else','while','for','do','until','repeat','with',
  'switch','case','default','break','continue','return','exit','and','or',
  'not','div','mod','true','false','noone','self','other','all','global',
  'local','new','delete','try','catch','finally','throw','static','function',
  'constructor','enum','begin','end',
];

const GML_BUILTINS = [
  'instance_create_layer','instance_destroy','instance_exists',
  'draw_sprite','draw_self','draw_text','draw_rectangle','draw_circle',
  'sprite_index','image_index','image_speed','image_xscale','image_yscale',
  'x','y','speed','direction','hspeed','vspeed','gravity','friction',
  'room_width','room_height','room_speed','room_goto','room_goto_next',
  'keyboard_check','keyboard_check_pressed','keyboard_check_released',
  'mouse_check_button','mouse_x','mouse_y',
  'audio_play_sound','audio_stop_sound','audio_is_playing',
  'show_debug_message','string','real','floor','ceil','round','abs',
  'min','max','clamp','lerp','point_distance','point_direction',
  'collision_rectangle','place_meeting','move_towards_point',
  'ds_list_create','ds_list_destroy','ds_list_add','ds_list_size',
  'array_length','array_push','array_pop','array_create',
  'object_index','id','depth','visible','persistent','solid',
  'alarm','path_index','mask_index',
];

function tokenizeGML(code) {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/(\/\/[^\n]*)/g, '<span class="gml-comment">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="gml-comment">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="gml-string">$1</span>')
    .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="gml-string">$1</span>')
    .replace(/\b(0x[0-9a-fA-F]+|\d+\.?\d*)\b/g, '<span class="gml-number">$1</span>')
    .replace(/(#[a-zA-Z_]\w*)/g, '<span class="gml-macro">$1</span>')
    .replace(
      new RegExp(`\\b(${GML_KEYWORDS.join('|')})\\b`, 'g'),
      '<span class="gml-keyword">$1</span>'
    )
    .replace(
      new RegExp(`\\b(${GML_BUILTINS.join('|')})\\b`, 'g'),
      '<span class="gml-builtin">$1</span>'
    );
}

const GMLEditor = ({ value = '', onChange }) => {
  const textareaRef = useRef(null);
  const preRef      = useRef(null);
  const [code, setCode] = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setCode(value);
    }
  }, [editing, value]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const syncScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop  = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setCode(val);
    onChange(val);
  };

  if (!editing) {
    return (
      <div
        className="gml-editor gml-editor--preview"
        onDoubleClick={() => setEditing(true)}
        title="Двічі клікни, щоб редагувати код"
      >
        <pre
          className="gml-highlight"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: tokenizeGML(code) + '\n' }}
        />
      </div>
    );
  }

  return (
    <div className="gml-editor nodrag">
      <pre
        ref={preRef}
        className="gml-highlight"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: tokenizeGML(code) + '\n' }}
      />
      <textarea
        ref={textareaRef}
        className="gml-textarea nodrag"
        value={code}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        onScroll={syncScroll}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </div>
  );
};

const TextNoteEditor = ({ value, placeholder, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    onChange(text);
  };

  if (!editing) {
    return (
      <div
        className={`node-input node-input--preview ${text ? '' : 'node-input--placeholder'}`}
        onDoubleClick={() => setEditing(true)}
        title="Двічі клікни, щоб редагувати текст"
      >
        {text || placeholder}
      </div>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      className="node-input nodrag"
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') commit();
      }}
      placeholder={placeholder}
    />
  );
};

// ── Media Upload (base64 with size limit) ─────────────────────────────────────

const readFileAsDataUrl = (file, onProgress) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onprogress = (event) => {
    if (!event.lengthComputable) return;
    onProgress(Math.round((event.loaded / event.total) * 35));
  };
  reader.onerror = () => reject(reader.error || new Error('Не вдалося прочитати файл.'));
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

const saveAudioToFirestore = async (file, nodeId, onProgress) => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error('Потрібно увійти в акаунт перед завантаженням аудіо.');
  }

  const dataUrl = await readFileAsDataUrl(file, onProgress);
  const chunks = [];
  for (let start = 0; start < dataUrl.length; start += FIRESTORE_AUDIO_CHUNK_SIZE) {
    chunks.push(dataUrl.slice(start, start + FIRESTORE_AUDIO_CHUNK_SIZE));
  }

  const assetId = `${userId}_${nodeId || 'node'}_${Date.now()}`;
  await setDoc(doc(db, 'audioAssets', assetId), {
    userId,
    nodeId: nodeId || null,
    name: file.name || 'audio',
    type: file.type || 'audio/mpeg',
    size: file.size,
    chunkCount: chunks.length,
    createdAt: serverTimestamp(),
  });

  for (let index = 0; index < chunks.length; index += 1) {
    const chunkId = String(index).padStart(5, '0');
    await setDoc(doc(db, 'audioAssets', assetId, 'chunks', chunkId), {
      index,
      data: chunks[index],
    });
    onProgress(35 + Math.round(((index + 1) / chunks.length) * 65));
  }

  return {
    kind: 'firestore-audio',
    assetId,
    name: file.name || 'audio',
    type: file.type || 'audio/mpeg',
    size: file.size,
    chunkCount: chunks.length,
  };
};

const notifyMediaUpload = (active) => {
  window.dispatchEvent(new CustomEvent('gamedev-tracker:media-upload', {
    detail: { active },
  }));
};

const MediaUpload = ({ accept, maxKB, contentType, nodeId, onUploaded }) => {
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > maxKB * 1024) {
      setError(`Файл занадто великий. Максимум ${maxKB} КБ.`);
      return;
    }
    setError('');
    setProgress(0);
    setUploading(true);
    notifyMediaUpload(true);

    try {
      if (contentType === 'audio') {
        const audioAsset = await saveAudioToFirestore(file, nodeId, setProgress);
        onUploaded(audioAsset);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => onUploaded(event.target.result);
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Помилка завантаження медіа:', err);
      setError(err.message || 'Не вдалося завантажити файл.');
    } finally {
      setUploading(false);
      notifyMediaUpload(false);
    }
  };

  return (
    <div className="media-upload-area">
      <label className="media-upload-label-btn nodrag">
        <input
          type="file"
          accept={accept}
          onChange={handleFile}
          style={{ display: 'none' }}
          className="nodrag"
        />
        <span>📂 Вибрати {contentType === 'image' ? 'зображення' : 'аудіо'}</span>
        <span className="media-upload-hint">до {maxKB} КБ</span>
      </label>
      {uploading && (
        <div className="media-upload-status">
          <div className="media-upload-progress">
            <div className="media-upload-bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="media-upload-label">Завантаження: {progress}%</span>
        </div>
      )}
      {error && <div className="media-upload-error">{error}</div>}
    </div>
  );
};

// ── NodeTitleBar ──────────────────────────────────────────────────────────────

const AudioPlayer = ({ content }) => {
  const [src, setSrc] = useState(typeof content === 'string' ? content : '');
  const [loading, setLoading] = useState(content?.kind === 'firestore-audio');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadAudio = async () => {
      if (!content) return;
      if (typeof content === 'string') {
        setSrc(content);
        setLoading(false);
        return;
      }
      if (content.kind !== 'firestore-audio' || !content.assetId) {
        setLoading(false);
        setError('Невідомий формат аудіо.');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const chunksQuery = query(
          collection(db, 'audioAssets', content.assetId, 'chunks'),
          orderBy('index')
        );
        const snapshot = await getDocs(chunksQuery);
        const dataUrl = snapshot.docs.map(chunkDoc => chunkDoc.data().data || '').join('');
        if (!cancelled) {
          if (!dataUrl) {
            setError('Аудіо не знайдено в базі даних.');
          } else {
            setSrc(dataUrl);
          }
        }
      } catch (err) {
        console.error('Помилка завантаження аудіо з БД:', err);
        if (!cancelled) setError('Не вдалося завантажити аудіо з БД.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAudio();
    return () => {
      cancelled = true;
    };
  }, [content]);

  if (loading) {
    return <div className="media-upload-label">Завантаження аудіо з БД...</div>;
  }

  if (error) {
    return <div className="media-upload-error">{error}</div>;
  }

  return <audio controls className="node-audio" src={src} />;
};

const NodeTitleBar = ({ title, placeholder, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title || '');

  return editing ? (
    <input
      autoFocus
      className="node-title-input nodrag"
      value={value}
      placeholder={placeholder}
      onChange={e => setValue(e.target.value)}
      onBlur={() => { setEditing(false); onChange(value); }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          setEditing(false);
          onChange(value);
        }
      }}
    />
  ) : (
    <div
      className="node-title-bar nodrag"
      onDoubleClick={() => setEditing(true)}
      title="Double-click to edit title"
    >
      {value || <span className="node-title-placeholder">{placeholder}</span>}
    </div>
  );
};

// ── CustomNode ────────────────────────────────────────────────────────────────

const CustomNode = ({ data, selected }) => {
  const onResize = (_, { size }) => {
    data.onChange({ width: size.width, height: size.height }, 'size');
  };

  if (data.contentType === 'kanban') {
    return <KanbanNode data={data} selected={selected} />;
  }

  const renderContent = () => {
    switch (data.contentType) {
      case 'image':
        return (
          <div className="media-container">
            {data.content ? (
              <img src={data.content} alt="Asset" className="node-image" />
            ) : (
              <MediaUpload
                accept="image/*"
                maxKB={IMAGE_MAX_KB}
                contentType="image"
                onUploaded={(url) => data.onChange(url, 'content')}
              />
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="media-container">
            {data.content ? (
              <AudioPlayer content={data.content} />
            ) : (
              <MediaUpload
                accept="audio/*"
                maxKB={AUDIO_MAX_KB}
                contentType="audio"
                nodeId={data.nodeId}
                onUploaded={(url) => data.onChange(url, 'content')}
              />
            )}
          </div>
        );

      case 'code':
        return (
          <>
            <NodeTitleBar
              title={data.label}
              placeholder="Script name..."
              onChange={(val) => data.onChange(val, 'label')}
            />
            <GMLEditor
              value={data.content || ''}
              onChange={(val) => data.onChange(val, 'content')}
            />
          </>
        );

      default:
        return (
          <>
            {data.showTitle && (
              <NodeTitleBar
                title={data.label}
                placeholder="Note title..."
                onChange={(val) => data.onChange(val, 'label')}
              />
            )}
            <TextNoteEditor
              value={data.showTitle ? (data.content || '') : data.label}
              onChange={(value) => data.onChange(value, data.showTitle ? 'content' : 'label')}
              placeholder="New Note..."
            />
          </>
        );
    }
  };

  return (
    <Resizable
      width={data.size?.width || 220}
      height={data.size?.height || 150}
      onResize={onResize}
      handle={<span className="resizer-handle nodrag" />}
      minConstraints={[160, 100]}
    >
      <div
        className={`custom-node ${selected ? 'selected' : ''}`}
        style={{ width: data.size?.width || 220, height: data.size?.height || 150 }}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="node-magnet nodrag"
          style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="node-magnet nodrag"
          style={{ bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' }}
        />

        <div className="node-body">
          {renderContent()}
          {data.showDescription && (
            <textarea
              className="node-description-text nodrag"
              placeholder="Add details..."
              defaultValue={data.description || ''}
              onChange={e => data.onChange(e.target.value, 'description')}
            />
          )}
        </div>
      </div>
    </Resizable>
  );
};

export default CustomNode;
