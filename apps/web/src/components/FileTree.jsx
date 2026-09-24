import React, { useState } from 'react';
import { Folder, FolderOpen, FileCode, FileText, Code2, ChevronRight, ChevronDown } from 'lucide-react';

/**
 * Builds a nested tree structure from an array of relative file path objects.
 */
function buildTree(files) {
  const root = { name: '', isDir: true, children: {} };

  files.forEach((file) => {
    const parts = file.path.split('/');
    let current = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      if (isLast) {
        current.children[part] = {
          name: part,
          path: file.path,
          isDir: false,
          fileData: file,
        };
      } else {
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            isDir: true,
            children: {},
          };
        }
        current = current.children[part];
      }
    });
  });

  return root;
}

function getFileIcon(filename) {
  if (filename.endsWith('.jsx') || filename.endsWith('.js')) {
    return <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  }
  if (filename.endsWith('.css')) {
    return <Code2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
  }
  return <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
}

function TreeNode({ node, selectedPath, onSelectFile, unsavedPaths, depth = 0 }) {
  const [isOpen, setIsOpen] = useState(true);

  if (node.isDir) {
    const childrenKeys = Object.keys(node.children || {}).sort((a, b) => {
      const aIsDir = node.children[a].isDir;
      const bIsDir = node.children[b].isDir;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    return (
      <div className="select-none">
        {node.name && (
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800/60 rounded text-xs text-zinc-300 cursor-pointer font-mono transition"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isOpen ? (
              <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
            )}
            {isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-500/60 shrink-0" />
            )}
            <span className="truncate font-semibold">{node.name}</span>
          </div>
        )}

        {isOpen && (
          <div>
            {childrenKeys.map((key) => (
              <TreeNode
                key={node.children[key].path || key}
                node={node.children[key]}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                unsavedPaths={unsavedPaths}
                depth={node.name ? depth + 1 : depth}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedPath === node.path;
  const isUnsaved = unsavedPaths && unsavedPaths.has(node.path);

  return (
    <div
      onClick={() => onSelectFile(node.path)}
      className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-xs cursor-pointer font-mono transition ${
        isSelected
          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <div className="flex items-center gap-2 truncate">
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </div>

      {isUnsaved && (
        <span
          title="Unsaved changes"
          className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 shadow-sm shadow-amber-400/50"
        />
      )}
    </div>
  );
}

export default function FileTree({ files = [], selectedPath, onSelectFile, unsavedPaths = new Set() }) {
  const tree = buildTree(files);

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 h-full overflow-y-auto font-mono text-xs shadow-inner">
      <div className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-2 px-2 flex items-center justify-between">
        <span>PROJECT FILES</span>
        <span className="text-zinc-600">{files.length} FILES</span>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-6 text-zinc-600 text-xs italic">No workspace files found</div>
      ) : (
        <TreeNode
          node={tree}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          unsavedPaths={unsavedPaths}
        />
      )}
    </div>
  );
}
