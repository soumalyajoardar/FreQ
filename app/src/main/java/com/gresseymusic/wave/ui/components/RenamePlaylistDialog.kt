package com.gresseymusic.wave.ui.components

import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryProvider
import com.gresseymusic.wave.ui.components.RenamePlaylistDialog
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import kotlinx.coroutines.launch














@Composable
fun RenamePlaylistDialog(
    playlistId: String,
    currentTitle: String,
    onDismiss: () -> Unit,
    onRenamed: () -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val libraryRepository = LocalLibraryRepositoryProvider.current

    var newTitle by remember { mutableStateOf(currentTitle) }
    var isSaving by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Rename Playlist",
                style = Typography.titleLarge,
                color = FreqTheme.colors.textPrimary,
                fontWeight = FontWeight.Bold,
            )
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
            ) {
                Text(
                    text = "Enter a new title for this playlist.",
                    style = Typography.bodyMedium,
                    color = FreqTheme.colors.textSecondary,
                )

                OutlinedTextField(
                    value = newTitle,
                    onValueChange = { newTitle = it },
                    label = { Text("Playlist Title", color = FreqTheme.colors.textMuted) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = FreqTheme.colors.textPrimary,
                        unfocusedTextColor = FreqTheme.colors.textPrimary,
                        cursorColor = FreqTheme.colors.textPrimary,
                        focusedBorderColor = FreqTheme.colors.textSecondary,
                        unfocusedBorderColor = FreqTheme.colors.glassBorder,
                    ),
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (newTitle.isBlank()) {
                        Toast.makeText(context, "Title cannot be empty", Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    if (isSaving) return@Button
                    isSaving = true
                    scope.launch {
                        val ok = libraryRepository.renamePlaylist(playlistId, newTitle)
                        isSaving = false
                        if (ok) {
                            Toast.makeText(context, "Playlist renamed", Toast.LENGTH_SHORT).show()
                            onRenamed()
                            onDismiss()
                        } else {
                            Toast.makeText(context, "Failed to rename playlist", Toast.LENGTH_SHORT).show()
                        }
                    }
                },
                enabled = newTitle.isNotBlank() && !isSaving,
                colors = ButtonDefaults.buttonColors(
                    containerColor = FreqTheme.colors.textPrimary,
                    contentColor = FreqTheme.colors.background,
                ),
            ) {
                Text("Save", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = FreqTheme.colors.textSecondary)
            }
        },
        containerColor = FreqTheme.colors.surfaceElevated,
        shape = FreqShapes.cardLarge,
    )
}