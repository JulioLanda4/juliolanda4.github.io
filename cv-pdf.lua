local function is_pdf_output()
  return FORMAT ~= "html" and FORMAT ~= "html5" and FORMAT ~= "commonmark"
end

local function has_class(el, class)
  if not el.classes then
    return false
  end

  for _, value in ipairs(el.classes) do
    if value == class then
      return true
    end
  end
  return false
end

local function append_all(target, source)
  for _, block in ipairs(source) do
    target:insert(block)
  end
end

local function stringify(block)
  return pandoc.utils.stringify(block)
end

local function latex_escape(value)
  value = value:gsub("\\", "\\textbackslash{}")
  value = value:gsub("([%%$#&_{}])", "\\%1")
  value = value:gsub("%^", "\\textasciicircum{}")
  value = value:gsub("~", "\\textasciitilde{}")
  return value
end

local function latex_lines_from_para(block)
  local lines = {}
  local current = {}

  for _, inline in ipairs(block.content) do
    if inline.t == "LineBreak" or inline.t == "SoftBreak" then
      table.insert(lines, pandoc.utils.stringify(pandoc.Inlines(current)))
      current = {}
    else
      table.insert(current, inline)
    end
  end

  if #current > 0 then
    table.insert(lines, pandoc.utils.stringify(pandoc.Inlines(current)))
  end

  return table.concat(lines, "\\\\")
end

local function plain_lines_from_para(block)
  local lines = {}
  local current = {}

  for _, inline in ipairs(block.content) do
    if inline.t == "LineBreak" or inline.t == "SoftBreak" then
      table.insert(lines, pandoc.utils.stringify(pandoc.Inlines(current)))
      current = {}
    else
      table.insert(current, inline)
    end
  end

  if #current > 0 then
    table.insert(lines, pandoc.utils.stringify(pandoc.Inlines(current)))
  end

  return lines
end

local function contact_items_from_para(block)
  local icons = {
    "\\faIcon{envelope}",
    "\\faIcon{github}",
    "\\faIcon{globe}",
    "\\faIcon{orcid}",
    "\\faIcon{graduation-cap}",
    "\\faIcon{map-marker-alt}",
  }
  local lines = plain_lines_from_para(block)
  local tex = {}

  for i, line in ipairs(lines) do
    local icon = icons[i] or "\\faIcon{circle}"
    local label = latex_escape(line)
    local targets = {
      "mailto:landajulioc@gmail.com",
      "https://github.com/JulioLanda4",
      "https://juliolanda4.github.io",
      "https://orcid.org/0009-0006-2067-6624",
      "https://scholar.google.com/citations?user=aoloTfAAAAAJ&hl=es",
    }
    if targets[i] then
      label = "\\href{" .. targets[i] .. "}{" .. label .. "}"
    end
    table.insert(tex, "\\cvcontactitem{" .. icon .. "}{" .. label .. "}")
  end

  return pandoc.RawBlock("latex", table.concat(tex, "\n"))
end

local function cv_sheet_to_latex(block)
  local sidebar = nil
  local main = nil

  for _, child in ipairs(block.content) do
    if child.t == "Div" and has_class(child, "cv-sidebar") then
      sidebar = child
    elseif child.t == "Div" and has_class(child, "cv-main") then
      main = child
    end
  end

  if not sidebar or not main then
    return pandoc.List({ block })
  end

  local name = "Julio Landa"
  local subtitle = ""
  local sidebar_start = 1

  if sidebar.content[1] and sidebar.content[1].t == "Header" then
    name = stringify(sidebar.content[1])
    sidebar_start = 2
  end

  if sidebar.content[sidebar_start] and sidebar.content[sidebar_start].t == "Para" then
    subtitle = latex_lines_from_para(sidebar.content[sidebar_start])
    sidebar_start = sidebar_start + 1
  end

  local blocks = pandoc.List()
  blocks:insert(pandoc.RawBlock("latex", "\\cvheader{" .. latex_escape(name) .. "}{" .. subtitle .. "}"))
  blocks:insert(pandoc.RawBlock("latex", "\\begin{cvcolumns}"))
  append_all(blocks, main.content)
  blocks:insert(pandoc.RawBlock("latex", "\\switchcolumn\\begin{cvsidebar}"))
  local i = sidebar_start
  while i <= #sidebar.content do
    local current = sidebar.content[i]
    local next_block = sidebar.content[i + 1]
    if current.t == "Header" and (stringify(current) == "Contacto" or stringify(current) == "Contact") and next_block and next_block.t == "Para" then
      blocks:insert(current)
      blocks:insert(contact_items_from_para(next_block))
      i = i + 2
    else
      blocks:insert(current)
      i = i + 1
    end
  end
  blocks:insert(pandoc.RawBlock("latex", "\\end{cvsidebar}"))
  blocks:insert(pandoc.RawBlock("latex", "\\end{cvcolumns}"))
  return blocks
end

function Pandoc(doc)
  if not is_pdf_output() then
    return doc
  end

  doc.meta.title = nil

  local blocks = pandoc.List()
  for _, block in ipairs(doc.blocks) do
    if block.t == "RawBlock" and block.format == "html" then
      -- The download buttons are only for the HTML page.
    elseif block.t == "Div" and has_class(block, "cv-sheet") then
      append_all(blocks, cv_sheet_to_latex(block))
    else
      blocks:insert(block)
    end
  end

  doc.blocks = blocks
  return doc
end
